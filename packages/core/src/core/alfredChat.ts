/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

// DISCLAIMER: This is a copied version of https://github.com/googleapis/js-genai/blob/main/src/chats.ts with the intention of working around a key bug
// where function responses are not treated as "valid" responses: https://b.corp.google.com/issues/420354090

import {
  GenerateContentResponse,
  type Content,
  type GenerateContentConfig,
  type SendMessageParameters,
  type Part,
  type Tool,
  FinishReason,
  ApiError,
} from '@google/genai';
import { toParts } from '../code_assist/converter.js';
import { createUserContent } from '@google/genai';
import { retryWithBackoff } from '../utils/retry.js';
import type { Config } from '../config/config.js';
import {
  DEFAULT_GEMINI_FLASH_MODEL,
  getEffectiveModel,
} from '../config/models.js';
import { hasCycleInSchema, MUTATOR_KINDS } from '../tools/tools.js';
import type { StructuredError } from './turn.js';
import {
  logContentRetry,
  logContentRetryFailure,
} from '../telemetry/loggers.js';
import { ChatRecordingService } from '../services/chatRecordingService.js';
import {
  ContentRetryEvent,
  ContentRetryFailureEvent,
} from '../telemetry/types.js';
import { handleFallback } from '../fallback/handler.js';
import { isFunctionResponse } from '../utils/messageInspectors.js';
import { partListUnionToString } from './alfredRequest.js';
import { uiTelemetryService } from '../telemetry/uiTelemetry.js';
import { HistoryService } from '../services/history/HistoryService.js';
import { ContentConverters } from '../services/history/ContentConverters.js';
import type {
  IContent,
  ToolCallBlock,
  ToolResponseBlock,
} from '../services/history/IContent.js';
import type { IProvider } from '../providers/IProvider.js';

export enum StreamEventType {
  /** A regular content chunk from the API. */
  CHUNK = 'chunk',
  /** A signal that a retry is about to happen. The UI should discard any partial
   * content from the attempt that just failed. */
  RETRY = 'retry',
}

export type StreamEvent =
  | { type: StreamEventType.CHUNK; value: GenerateContentResponse }
  | { type: StreamEventType.RETRY };

/**
 * Options for retrying due to invalid content from the model.
 */
interface ContentRetryOptions {
  /** Total number of attempts to make (1 initial + N retries). */
  maxAttempts: number;
  /** The base delay in milliseconds for linear backoff. */
  initialDelayMs: number;
}

const INVALID_CONTENT_RETRY_OPTIONS: ContentRetryOptions = {
  maxAttempts: 2, // 1 initial call + 1 retry
  initialDelayMs: 500,
};

/**
 * Returns true if the response is valid, false otherwise.
 */
function isValidResponse(response: GenerateContentResponse): boolean {
  if (response.candidates === undefined || response.candidates.length === 0) {
    return false;
  }
  const content = response.candidates[0]?.content;
  if (content === undefined) {
    return false;
  }
  return isValidContent(content);
}

export function isValidNonThoughtTextPart(part: Part): boolean {
  return (
    typeof part.text === 'string' &&
    !part.thought &&
    // Technically, the model should never generate parts that have text and
    //  any of these but we don't trust them so check anyways.
    !part.functionCall &&
    !part.functionResponse &&
    !part.inlineData &&
    !part.fileData
  );
}

function isValidContent(content: Content): boolean {
  if (content.parts === undefined || content.parts.length === 0) {
    return false;
  }
  for (const part of content.parts) {
    if (part === undefined || Object.keys(part).length === 0) {
      return false;
    }
    if (!part.thought && part.text !== undefined && part.text === '') {
      return false;
    }
  }
  return true;
}

/**
 * Validates the history contains the correct roles.
 *
 * @throws Error if the history does not start with a user turn.
 * @throws Error if the history contains an invalid role.
 */
function validateHistory(history: Content[]) {
  for (const content of history) {
    if (content.role !== 'user' && content.role !== 'model') {
      throw new Error(`Role must be user or model, but got ${content.role}.`);
    }
  }
}

/**
 * Custom error to signal that a stream completed with invalid content,
 * which should trigger a retry.
 */
export class InvalidStreamError extends Error {
  readonly type: 'NO_FINISH_REASON' | 'NO_RESPONSE_TEXT';

  constructor(message: string, type: 'NO_FINISH_REASON' | 'NO_RESPONSE_TEXT') {
    super(message);
    this.name = 'InvalidStreamError';
    this.type = type;
  }
}

/**
 * Chat session that enables sending messages to the model with previous
 * conversation context.
 *
 * @remarks
 * The session maintains all the turns between user and model.
 */
export class AlfredChat {
  // A promise to represent the current state of the message being sent to the
  // model.
  private sendPromise: Promise<void> = Promise.resolve();
  private readonly chatRecordingService: ChatRecordingService;
  private historyService: HistoryService;

  constructor(
    private readonly config: Config,
    private readonly generationConfig: GenerateContentConfig = {},
    initialHistory: Content[] = [],
  ) {
    validateHistory(initialHistory);
    this.chatRecordingService = new ChatRecordingService(config);
    this.chatRecordingService.initialize();

    // Initialize HistoryService for provider support
    this.historyService = new HistoryService();

    // Convert and add initial history to HistoryService
    if (initialHistory.length > 0) {
      const currentModel = this.config.getModel();
      const idGen = this.historyService.getIdGeneratorCallback();
      for (const content of initialHistory) {
        const matcher = this.makePositionMatcher();
        this.historyService.add(
          ContentConverters.toIContent(content, idGen, matcher),
          currentModel,
        );
      }
    }
  }

  setSystemInstruction(sysInstr: string) {
    this.generationConfig.systemInstruction = sysInstr;
  }

  /**
   * Sends a message to the model and returns the response in chunks.
   *
   * @remarks
   * This method will wait for the previous message to be processed before
   * sending the next message.
   *
   * @see {@link Chat#sendMessage} for non-streaming method.
   * @param params - parameters for sending the message.
   * @return The model's response.
   *
   * @example
   * ```ts
   * const chat = ai.chats.create({model: 'gemini-2.0-flash'});
   * const response = await chat.sendMessageStream({
   * message: 'Why is the sky blue?'
   * });
   * for await (const chunk of response) {
   * console.log(chunk.text);
   * }
   * ```
   */
  async sendMessageStream(
    model: string,
    params: SendMessageParameters,
    prompt_id: string,
  ): Promise<AsyncGenerator<StreamEvent>> {
    await this.sendPromise;

    let streamDoneResolver: () => void;
    const streamDonePromise = new Promise<void>((resolve) => {
      streamDoneResolver = resolve;
    });
    this.sendPromise = streamDonePromise;

    // Check if this is a paired tool call/response array (from tool executor)
    let userContent: Content | Content[];
    const messageArray = Array.isArray(params.message) ? params.message : null;
    const isPairedToolResponse =
      messageArray &&
      messageArray.length === 2 &&
      messageArray[0] &&
      typeof messageArray[0] === 'object' &&
      'functionCall' in messageArray[0] &&
      messageArray[1] &&
      typeof messageArray[1] === 'object' &&
      'functionResponse' in messageArray[1];

    if (isPairedToolResponse && messageArray) {
      // For providers, only send the tool response, not the echo of the tool call
      // The tool call is already in history from the model's previous response
      // The echo is only needed for legacy Gemini API
      const provider = this.getActiveProvider();
      if (provider && this.providerSupportsIContent(provider)) {
        userContent = createUserContent([messageArray[1]]);
      } else {
        // Legacy path: include both tool call and response (matching llxprt-code)
        userContent = [
          {
            role: 'model' as const,
            parts: [messageArray[0] as Part],
          },
          {
            role: 'user' as const,
            parts: [messageArray[1] as Part],
          },
        ];
      }
    } else {
      userContent = createUserContent(params.message);
    }

    // Record user input - capture complete message with all parts (text, files, images, etc.)
    // but skip recording function responses (tool call results) as they should be stored in tool call records
    // Skip recording if it's a paired tool response (array) or a function response
    const shouldSkipRecording =
      Array.isArray(userContent) || isFunctionResponse(userContent);
    if (!shouldSkipRecording) {
      const userMessage = Array.isArray(params.message)
        ? params.message
        : [params.message];
      const userMessageContent = partListUnionToString(toParts(userMessage));
      this.chatRecordingService.recordMessage({
        model,
        type: 'user',
        content: userMessageContent,
      });
    }

    // DO NOT add anything to history here - wait until after successful send!
    // Tool responses will be handled in recordHistory after the model responds
    // This is the "send-then-commit" pattern to avoid orphaned tool calls

    // Get current history WITHOUT the new user message
    const currentHistory = this.getHistory(true);

    // Build request with history + new user content (but don't commit to history yet)
    let requestContents: Content[];
    if (Array.isArray(userContent)) {
      // This is a tool call/response pair
      // For providers, we only need the response part since the tool call is already in history
      const provider = this.getActiveProvider();
      if (provider && this.providerSupportsIContent(provider)) {
        // Only include the tool response (second element), not the echo
        requestContents = [...currentHistory, userContent[1]];
      } else {
        // Legacy Gemini API needs both the echo and response
        requestContents = [...currentHistory, ...userContent];
      }
    } else if (!Array.isArray(userContent) && userContent.parts) {
      // Check if this is tool responses (multiple tools called in parallel)
      const provider = this.getActiveProvider();
      if (provider && this.providerSupportsIContent(provider)) {
        // For providers like Anthropic, we need to split multiple tool responses into separate messages
        const toolResponseParts = userContent.parts.filter(
          (part) =>
            part && typeof part === 'object' && 'functionResponse' in part,
        );

        if (toolResponseParts.length > 0) {
          // Create separate messages for each tool response
          const toolResponseMessages: Content[] = toolResponseParts.map(
            (part) => ({
              role: 'user' as const,
              parts: [part],
            }),
          );

          requestContents = [...currentHistory, ...toolResponseMessages];
        } else {
          // Not tool responses, treat as regular user message
          requestContents = [...currentHistory, userContent];
        }
      } else {
        // Legacy API or non-tool-response message
        requestContents = [...currentHistory, userContent];
      }
    } else {
      requestContents = [...currentHistory, userContent];
    }

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    return (async function* () {
      try {
        let lastError: unknown = new Error('Request failed after all retries.');

        for (
          let attempt = 0;
          attempt < INVALID_CONTENT_RETRY_OPTIONS.maxAttempts;
          attempt++
        ) {
          try {
            if (attempt > 0) {
              yield { type: StreamEventType.RETRY };
            }

            const stream = await self.makeApiCallAndProcessStream(
              model,
              requestContents,
              params,
              prompt_id,
              userContent,
            );

            for await (const chunk of stream) {
              yield { type: StreamEventType.CHUNK, value: chunk };
            }

            // History is managed by processStreamResponse - it adds both user and model messages
            lastError = null;
            break;
          } catch (error) {
            lastError = error;
            const isContentError = error instanceof InvalidStreamError;

            if (isContentError) {
              // Check if we have more attempts left.
              if (attempt < INVALID_CONTENT_RETRY_OPTIONS.maxAttempts - 1) {
                logContentRetry(
                  self.config,
                  new ContentRetryEvent(
                    attempt,
                    (error as InvalidStreamError).type,
                    INVALID_CONTENT_RETRY_OPTIONS.initialDelayMs,
                    model,
                  ),
                );
                await new Promise((res) =>
                  setTimeout(
                    res,
                    INVALID_CONTENT_RETRY_OPTIONS.initialDelayMs *
                      (attempt + 1),
                  ),
                );
                continue;
              }
            }
            break;
          }
        }

        if (lastError) {
          if (lastError instanceof InvalidStreamError) {
            logContentRetryFailure(
              self.config,
              new ContentRetryFailureEvent(
                INVALID_CONTENT_RETRY_OPTIONS.maxAttempts,
                (lastError as InvalidStreamError).type,
                model,
              ),
            );
          }
          // With send-then-commit pattern, history is only updated on success
          throw lastError;
        }
      } finally {
        streamDoneResolver!();
      }
    })();
  }

  private async makeApiCallAndProcessStream(
    model: string,
    requestContents: Content[],
    params: SendMessageParameters,
    prompt_id: string,
    userInput: Content | Content[],
  ): Promise<AsyncGenerator<GenerateContentResponse>> {
    // Try to use provider if available
    const provider = this.getActiveProvider();
    if (provider && this.providerSupportsIContent(provider)) {
      const providerStream = await this.makeProviderApiCall(
        requestContents,
        params,
        userInput,
      );
      return this.processStreamResponse(model, providerStream, userInput);
    }

    // Fallback to legacy ContentGenerator
    const apiCall = () => {
      const modelToUse = getEffectiveModel(
        this.config.isInFallbackMode(),
        model,
      );

      if (
        this.config.getQuotaErrorOccurred() &&
        modelToUse === DEFAULT_GEMINI_FLASH_MODEL
      ) {
        throw new Error(
          'Please submit a new query to continue with the Flash model.',
        );
      }

      return this.config.getContentGenerator().generateContentStream(
        {
          model: modelToUse,
          contents: requestContents,
          config: { ...this.generationConfig, ...params.config },
        },
        prompt_id,
      );
    };

    const onPersistent429Callback = async (
      authType?: string,
      error?: unknown,
    ) => await handleFallback(this.config, model, authType, error);

    const streamResponse = await retryWithBackoff(apiCall, {
      shouldRetryOnError: (error: unknown) => {
        if (error instanceof ApiError && error.message) {
          if (error.status === 400) return false;
          if (isSchemaDepthError(error.message)) return false;
          if (error.status === 429) return true;
          if (error.status >= 500 && error.status < 600) return true;
        }
        return false;
      },
      onPersistent429: onPersistent429Callback,
      authType: this.config.getContentGeneratorConfig()?.authType,
    });

    return this.processStreamResponse(model, streamResponse, userInput);
  }

  /**
   * Make API call using the provider (Anthropic, Gemini via provider, etc.)
   */
  private async makeProviderApiCall(
    requestContents: Content[],
    _params: SendMessageParameters,
    _userInput: Content | Content[],
  ): Promise<AsyncGenerator<GenerateContentResponse>> {
    const provider = this.getActiveProvider();
    if (!provider) {
      throw new Error('No active provider configured');
    }

    // Convert Gemini Content[] to IContent[]
    const idGen = this.historyService.getIdGeneratorCallback();
    const matcher = this.makePositionMatcher();
    const iContents: IContent[] = requestContents.map((content) =>
      ContentConverters.toIContent(content, idGen, matcher),
    );

    // Get tools in the format the provider expects
    const tools = this.generationConfig.tools;

    // Call the provider directly with IContent
    const streamResponse = provider.generateChatCompletion!(
      iContents,
      tools as
        | Array<{
            functionDeclarations: Array<{
              name: string;
              description?: string;
              parametersJsonSchema?: unknown;
            }>;
          }>
        | undefined,
    );

    // Convert IContent stream to GenerateContentResponse stream
    // Return the converted stream WITHOUT calling processStreamResponse here
    // The caller will call processStreamResponse to ensure history is recorded only once
    return async function* () {
      for await (const iContent of streamResponse) {
        yield this.convertIContentToResponse(iContent);
      }
    }.bind(this)();
  }

  /**
   * Returns the chat history.
   *
   * @remarks
   * The history is a list of contents alternating between user and model.
   *
   * There are two types of history:
   * - The `curated history` contains only the valid turns between user and
   * model, which will be included in the subsequent requests sent to the model.
   * - The `comprehensive history` contains all turns, including invalid or
   * empty model outputs, providing a complete record of the history.
   *
   * The history is updated after receiving the response from the model,
   * for streaming response, it means receiving the last chunk of the response.
   *
   * The `comprehensive history` is returned by default. To get the `curated
   * history`, set the `curated` parameter to `true`.
   *
   * @param curated - whether to return the curated history or the comprehensive
   * history.
   * @return History contents alternating between user and model for the entire
   * chat session.
   */
  getHistory(curated: boolean = false): Content[] {
    // Get history from HistoryService in IContent format
    const iContents = curated
      ? this.historyService.getCurated()
      : this.historyService.getAll();

    // Convert to Gemini Content format
    const contents = ContentConverters.toGeminiContents(iContents);

    // Deep copy the history to avoid mutating the history outside of the
    // chat session.
    return structuredClone(contents);
  }

  /**
   * Clears the chat history.
   */
  clearHistory(): void {
    this.historyService.clear();
  }

  /**
   * Adds a new entry to the chat history.
   */
  addHistory(content: Content): void {
    this.historyService.add(
      ContentConverters.toIContent(content),
      this.config.getModel(),
    );
  }

  /**
   * Sets the chat history, replacing any existing history.
   */
  setHistory(history: Content[]): void {
    this.historyService.clear();
    const currentModel = this.config.getModel();
    for (const content of history) {
      this.historyService.add(
        ContentConverters.toIContent(content),
        currentModel,
      );
    }
  }

  /**
   * Removes thinking/thought content from loaded history for backwards compatibility.
   * This strips both Gemini thoughts (thought: true, thoughtSignature) and
   * Anthropic thinking blocks (type: 'thinking').
   *
   * Used when loading history from files to ensure old history doesn't contain
   * internal reasoning that wasn't meant to be persisted.
   */
  stripThoughtsFromHistory(): void {
    // Get current history from service
    const currentHistory = this.getHistory(true);

    // Filter and clean thoughts from history
    const cleanedHistory = currentHistory.map((content) => {
      const newContent = { ...content };
      if (newContent.parts) {
        newContent.parts = newContent.parts.filter((part) => {
          // Filter Gemini thoughts (has 'thought' property or 'thoughtSignature')
          if (part && typeof part === 'object') {
            if ('thought' in part || 'thoughtSignature' in part) {
              return false;
            }
            // Filter Anthropic thinking blocks (type: 'thinking')
            if ('type' in part && part.type === 'thinking') {
              return false;
            }
          }
          return true;
        });
      }
      return newContent;
    });

    // Reset history with cleaned content
    this.setHistory(cleanedHistory);
  }

  setTools(tools: Tool[]): void {
    this.generationConfig.tools = tools;
  }

  async maybeIncludeSchemaDepthContext(error: StructuredError): Promise<void> {
    // Check for potentially problematic cyclic tools with cyclic schemas
    // and include a recommendation to remove potentially problematic tools.
    if (
      isSchemaDepthError(error.message) ||
      isInvalidArgumentError(error.message)
    ) {
      const tools = this.config.getToolRegistry().getAllTools();
      const cyclicSchemaTools: string[] = [];
      for (const tool of tools) {
        if (
          (tool.schema.parametersJsonSchema &&
            hasCycleInSchema(tool.schema.parametersJsonSchema)) ||
          (tool.schema.parameters && hasCycleInSchema(tool.schema.parameters))
        ) {
          cyclicSchemaTools.push(tool.displayName);
        }
      }
      if (cyclicSchemaTools.length > 0) {
        const extraDetails =
          `\n\nThis error was probably caused by cyclic schema references in one of the following tools, try disabling them with excludeTools:\n\n - ` +
          cyclicSchemaTools.join(`\n - `) +
          `\n`;
        error.message += extraDetails;
      }
    }
  }

  private async *processStreamResponse(
    model: string,
    streamResponse: AsyncGenerator<GenerateContentResponse>,
    userInput: Content | Content[],
  ): AsyncGenerator<GenerateContentResponse> {
    const modelResponseParts: Part[] = [];

    let hasToolCall = false;
    let hasFinishReason = false;

    for await (const chunk of this.stopBeforeSecondMutator(streamResponse)) {
      hasFinishReason =
        chunk?.candidates?.some((candidate) => candidate.finishReason) ?? false;
      if (isValidResponse(chunk)) {
        const content = chunk.candidates?.[0]?.content;
        if (content?.parts) {
          if (content.parts.some((part) => part.thought)) {
            // Record thoughts
            this.recordThoughtFromContent(content);
          }
          if (content.parts.some((part) => part.functionCall)) {
            hasToolCall = true;
          }

          modelResponseParts.push(
            ...content.parts.filter((part) => !part.thought),
          );
        }
      }

      // Record token usage if this chunk has usageMetadata
      if (chunk.usageMetadata) {
        this.chatRecordingService.recordMessageTokens(chunk.usageMetadata);
        if (chunk.usageMetadata.promptTokenCount !== undefined) {
          uiTelemetryService.setLastPromptTokenCount(
            chunk.usageMetadata.promptTokenCount,
          );
        }
      }

      yield chunk; // Yield every chunk to the UI immediately.
    }

    // String thoughts and consolidate text parts.
    const consolidatedParts: Part[] = [];
    for (const part of modelResponseParts) {
      const lastPart = consolidatedParts[consolidatedParts.length - 1];
      if (
        lastPart?.text &&
        isValidNonThoughtTextPart(lastPart) &&
        isValidNonThoughtTextPart(part)
      ) {
        lastPart.text += part.text;
      } else {
        consolidatedParts.push(part);
      }
    }

    const responseText = consolidatedParts
      .filter((part) => part.text)
      .map((part) => part.text)
      .join('')
      .trim();

    // Record model response text from the collected parts
    if (responseText) {
      this.chatRecordingService.recordMessage({
        model,
        type: 'gemini',
        content: responseText,
      });
    }

    // Stream validation logic: A stream is considered successful if:
    // 1. There's a tool call (tool calls can end without explicit finish reasons), OR
    // 2. There's a finish reason AND we have non-empty response text
    //
    // We throw an error only when there's no tool call AND:
    // - No finish reason, OR
    // - Empty response text (e.g., only thoughts with no actual content)
    if (!hasToolCall && (!hasFinishReason || !responseText)) {
      if (!hasFinishReason) {
        throw new InvalidStreamError(
          'Model stream ended without a finish reason.',
          'NO_FINISH_REASON',
        );
      } else {
        throw new InvalidStreamError(
          'Model stream ended with empty response text.',
          'NO_RESPONSE_TEXT',
        );
      }
    }

    // Use recordHistory to correctly save the conversation turn.
    const modelOutput: Content[] = [
      { role: 'model', parts: consolidatedParts },
    ];
    this.recordHistory(userInput, modelOutput, undefined);
  }

  /**
   * Gets the chat recording service instance.
   */
  getChatRecordingService(): ChatRecordingService {
    return this.chatRecordingService;
  }

  /**
   * Extracts and records thought from thought content.
   */
  private recordThoughtFromContent(content: Content): void {
    if (!content.parts || content.parts.length === 0) {
      return;
    }

    const thoughtPart = content.parts[0];
    if (thoughtPart.text) {
      // Extract subject and description using the same logic as turn.ts
      const rawText = thoughtPart.text;
      const subjectStringMatches = rawText.match(/\*\*(.*?)\*\*/s);
      const subject = subjectStringMatches
        ? subjectStringMatches[1].trim()
        : '';
      const description = rawText.replace(/\*\*(.*?)\*\*/s, '').trim();

      this.chatRecordingService.recordThought({
        subject,
        description,
      });
    }
  }

  /**
   * Truncates the chunkStream right before the second function call to a
   * function that mutates state. This may involve trimming parts from a chunk
   * as well as omtting some chunks altogether.
   *
   * We do this because it improves tool call quality if the model gets
   * feedback from one mutating function call before it makes the next one.
   */
  private async *stopBeforeSecondMutator(
    chunkStream: AsyncGenerator<GenerateContentResponse>,
  ): AsyncGenerator<GenerateContentResponse> {
    let foundMutatorFunctionCall = false;

    for await (const chunk of chunkStream) {
      const candidate = chunk.candidates?.[0];
      const content = candidate?.content;
      if (!candidate || !content?.parts) {
        yield chunk;
        continue;
      }

      const truncatedParts: Part[] = [];
      for (const part of content.parts) {
        if (this.isMutatorFunctionCall(part)) {
          if (foundMutatorFunctionCall) {
            // This is the second mutator call.
            // Truncate and return immedaitely.
            const newChunk = new GenerateContentResponse();
            newChunk.candidates = [
              {
                ...candidate,
                content: {
                  ...content,
                  parts: truncatedParts,
                },
                finishReason: FinishReason.STOP,
              },
            ];
            yield newChunk;
            return;
          }
          foundMutatorFunctionCall = true;
        }
        truncatedParts.push(part);
      }

      yield chunk;
    }
  }

  private isMutatorFunctionCall(part: Part): boolean {
    if (!part?.functionCall?.name) {
      return false;
    }
    const tool = this.config.getToolRegistry().getTool(part.functionCall.name);
    return !!tool && MUTATOR_KINDS.includes(tool.kind);
  }

  /**
   * Create a position-based matcher for tool responses.
   * Returns the next unmatched tool call from the current history.
   */
  private makePositionMatcher():
    | (() => { historyId: string; toolName?: string })
    | undefined {
    const queue = this.historyService
      .findUnmatchedToolCalls()
      .map((b) => ({ historyId: b.id, toolName: b.name }));

    // Return undefined if there are no unmatched tool calls
    if (queue.length === 0) {
      return undefined;
    }

    // Return a function that always returns a valid value (never undefined)
    return () => {
      const result = queue.shift();
      // If queue is empty, return a fallback value
      return result || { historyId: '', toolName: undefined };
    };
  }

  /**
   * Get the active provider from the ProviderManager via Config
   */
  private getActiveProvider(): IProvider | undefined {
    const providerManager = this.config.getProviderManager();
    if (!providerManager) {
      return undefined;
    }

    try {
      return providerManager.getActiveProvider();
    } catch {
      // No active provider set
      return undefined;
    }
  }

  /**
   * Check if a provider supports the IContent interface
   */
  private providerSupportsIContent(provider: IProvider | undefined): boolean {
    if (!provider) {
      return false;
    }

    // Check if the provider has the IContent method
    return (
      typeof (provider as { generateChatCompletion?: unknown })
        .generateChatCompletion === 'function'
    );
  }

  /**
   * Convert IContent (from provider) to GenerateContentResponse for SDK compatibility
   */
  private convertIContentToResponse(input: IContent): GenerateContentResponse {
    // Convert IContent blocks to Gemini Parts
    const parts: Part[] = [];

    for (const block of input.blocks) {
      switch (block.type) {
        case 'text':
          parts.push({ text: block.text });
          break;
        case 'tool_call': {
          const toolCall = block as ToolCallBlock;
          parts.push({
            functionCall: {
              id: toolCall.id,
              name: toolCall.name,
              args: toolCall.parameters as Record<string, unknown>,
            },
          });
          break;
        }
        case 'tool_response': {
          const toolResponse = block as ToolResponseBlock;
          parts.push({
            functionResponse: {
              id: toolResponse.callId,
              name: toolResponse.toolName,
              response: toolResponse.result as Record<string, unknown>,
            },
          });
          break;
        }
        case 'thinking':
          // Include thinking blocks as thought parts
          parts.push({
            thought: true,
            text: block.thought,
          });
          break;
        default:
          // Skip unsupported block types
          break;
      }
    }

    // Build the response structure
    const response = {
      candidates: [
        {
          content: {
            role: 'model',
            parts,
          },
          // Add finishReason for stream validation
          finishReason: 'STOP' as const,
        },
      ],
      // These are required properties that must be present
      get text() {
        return parts.find((p) => 'text' in p)?.text || '';
      },
      functionCalls: parts
        .filter((p) => 'functionCall' in p)
        .map((p) => p.functionCall!),
      executableCode: undefined,
      codeExecutionResult: undefined,
      // data property will be added below
    } as GenerateContentResponse;

    // Add data property that returns self-reference
    // Make it non-enumerable to avoid circular reference in JSON.stringify
    Object.defineProperty(response, 'data', {
      get() {
        return response;
      },
      enumerable: false,
      configurable: true,
    });

    // Add usage metadata if present
    if (input.metadata?.usage) {
      response.usageMetadata = {
        promptTokenCount: input.metadata.usage.promptTokens || 0,
        candidatesTokenCount: input.metadata.usage.completionTokens || 0,
        totalTokenCount: input.metadata.usage.totalTokens || 0,
      };
    }

    return response;
  }

  /**
   * Records a conversation turn in the history service.
   * Handles user input, model output, and automatic function calling history.
   */
  private recordHistory(
    userInput: Content | Content[],
    modelOutput: Content[],
    usageMetadata?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    } | null,
  ): void {
    const newHistoryEntries: IContent[] = [];

    // Part 1: Handle the user's part of the turn.
    const idGen = this.historyService.getIdGeneratorCallback();
    const matcher = this.makePositionMatcher();

    if (Array.isArray(userInput)) {
      // This is a paired tool call/response from the executor
      const provider = this.getActiveProvider();
      if (provider && this.providerSupportsIContent(provider)) {
        // For providers: only record the tool response (second element)
        // The tool call is already in history from the model's previous response
        const userIContent = ContentConverters.toIContent(
          userInput[1],
          idGen,
          matcher,
        );
        newHistoryEntries.push(userIContent);
      } else {
        // Legacy Gemini API: record both the echo and response
        for (const content of userInput) {
          const userIContent = ContentConverters.toIContent(
            content,
            idGen,
            matcher,
          );
          newHistoryEntries.push(userIContent);
        }
      }
    } else if (!Array.isArray(userInput) && userInput.parts) {
      // Check if this is multiple tool responses in a single message
      const provider = this.getActiveProvider();
      if (provider && this.providerSupportsIContent(provider)) {
        const toolResponseParts = userInput.parts.filter(
          (part) =>
            part && typeof part === 'object' && 'functionResponse' in part,
        );

        if (toolResponseParts.length > 0) {
          // Multiple tool responses - split into separate history entries
          for (const responsePart of toolResponseParts) {
            const responseContent: Content = {
              role: 'user' as const,
              parts: [responsePart],
            };
            const userIContent = ContentConverters.toIContent(
              responseContent,
              idGen,
              matcher,
            );
            newHistoryEntries.push(userIContent);
          }
        } else {
          // Regular user message
          const userIContent = ContentConverters.toIContent(
            userInput,
            idGen,
            matcher,
          );
          newHistoryEntries.push(userIContent);
        }
      } else {
        // Legacy API or non-provider
        const userIContent = ContentConverters.toIContent(
          userInput,
          idGen,
          matcher,
        );
        newHistoryEntries.push(userIContent);
      }
    } else {
      // Normal user message
      const userIContent = ContentConverters.toIContent(
        userInput,
        idGen,
        matcher,
      );
      newHistoryEntries.push(userIContent);
    }

    // Part 2: Handle the model's part of the turn, filtering out thoughts.
    const nonThoughtModelOutput = modelOutput.filter(
      (content) => !this.isThoughtContent(content),
    );

    let outputContents: Content[] = [];
    if (nonThoughtModelOutput.length > 0) {
      outputContents = nonThoughtModelOutput;
    } else if (
      modelOutput.length === 0 &&
      !Array.isArray(userInput) &&
      !isFunctionResponse(userInput)
    ) {
      // Add an empty model response if the model truly returned nothing.
      outputContents.push({ role: 'model', parts: [] } as Content);
    }

    // Part 3: Consolidate the parts of this turn's model response.
    const consolidatedOutputContents: Content[] = [];
    if (outputContents.length > 0) {
      for (const content of outputContents) {
        const lastContent =
          consolidatedOutputContents[consolidatedOutputContents.length - 1];
        if (this.hasTextContent(lastContent) && this.hasTextContent(content)) {
          lastContent.parts[0].text += content.parts[0].text || '';
          if (content.parts.length > 1) {
            lastContent.parts.push(...content.parts.slice(1));
          }
        } else {
          consolidatedOutputContents.push(content);
        }
      }
    }

    // Part 4: Add the new turn (user and model parts) to the history service.
    const currentModel = this.config.getModel();
    for (const entry of newHistoryEntries) {
      this.historyService.add(entry, currentModel);
    }
    for (const content of consolidatedOutputContents) {
      // Always add model responses to history, including tool calls
      // Tool calls from the model need to be in history so the model knows it made them
      const iContent = ContentConverters.toIContent(content);

      // Add usage metadata if available from streaming
      if (usageMetadata) {
        iContent.metadata = {
          ...iContent.metadata,
          usage: {
            promptTokens: usageMetadata.promptTokens,
            completionTokens: usageMetadata.completionTokens,
            totalTokens: usageMetadata.totalTokens,
          },
        };
      }

      // ALWAYS add model responses to history, regardless of usage metadata
      this.historyService.add(iContent, currentModel);
    }
  }

  /**
   * Helper to check if content has text.
   */
  private hasTextContent(
    content: Content | undefined,
  ): content is Content & { parts: [{ text: string }, ...Part[]] } {
    return !!(
      content &&
      content.role === 'model' &&
      content.parts &&
      content.parts.length > 0 &&
      typeof content.parts[0].text === 'string' &&
      content.parts[0].text !== ''
    );
  }

  /**
   * Checks if content contains thinking/thought blocks from any provider.
   * Supports both Gemini (thought: true) and Anthropic (type: 'thinking') formats.
   */
  private isThoughtContent(content: Content): boolean {
    if (!content.parts || content.parts.length === 0) {
      return false;
    }

    const firstPart = content.parts[0];
    if (!firstPart || typeof firstPart !== 'object') {
      return false;
    }

    // Check for Gemini thought format
    if ('thought' in firstPart) {
      return true;
    }

    // Check for Anthropic thinking format
    if ('type' in firstPart && firstPart.type === 'thinking') {
      return true;
    }

    return false;
  }
}

/** Visible for Testing */
export function isSchemaDepthError(errorMessage: string): boolean {
  return errorMessage.includes('maximum schema depth exceeded');
}

export function isInvalidArgumentError(errorMessage: string): boolean {
  return errorMessage.includes('Request contains an invalid argument');
}
