/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  ContentGenerator,
  ContentGeneratorConfig,
} from '../core/contentGenerator.js';
import type {
  GenerateContentParameters,
  GenerateContentResponse,
  CountTokensParameters,
  CountTokensResponse,
  EmbedContentParameters,
  EmbedContentResponse,
  Content,
  Part,
} from '@google/genai';
import { createUserContent } from '@google/genai';
import type { IProviderManager as ProviderManager } from './IProviderManager.js';

/**
 * ContentGenerator implementation that delegates to external providers
 */
export class ProviderContentGenerator implements ContentGenerator {
  constructor(
    private providerManager: ProviderManager,
    private _config: ContentGeneratorConfig,
  ) {
    // Config parameter is reserved for future use
    void this._config;
  }

  async generateContent(
    request: GenerateContentParameters,
  ): Promise<GenerateContentResponse> {
    // For now, just delegate to stream and get first result
    const stream = await this.generateContentStream(request);
    const result = await stream.next();
    if (result.done) {
      throw new Error('Provider returned empty stream');
    }
    return result.value;
  }

  async generateContentStream(
    request: GenerateContentParameters,
  ): Promise<AsyncGenerator<GenerateContentResponse>> {
    const provider = this.providerManager.getActiveProvider();
    if (!provider) {
      throw new Error('No active provider');
    }

    // Convert to IContent and call provider
    const { ContentConverters } = await import(
      '../services/history/ContentConverters.js'
    );

    // Simple normalization - alfredChat always sends Content[] now
    const contents: Content[] =
      typeof request.contents === 'string'
        ? [createUserContent(request.contents)]
        : Array.isArray(request.contents)
          ? (request.contents as Content[])
          : [request.contents as Content];

    // Provider-specific preprocessing for tool responses
    const processedContents = this.preprocessForProvider(contents);

    const iContents = processedContents.map((content: Content) =>
      ContentConverters.toIContent(content),
    );

    // Get stream from provider
    const stream = provider.generateChatCompletion(
      iContents,
      request.config?.tools as
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
    return (async function* () {
      for await (const iContent of stream) {
        yield ContentConverters.toGenerateContentResponse(iContent);
      }
    })();
  }

  async countTokens(
    request: CountTokensParameters,
  ): Promise<CountTokensResponse> {
    // Rough estimation for providers that don't support token counting
    let text = '';
    if (typeof request.contents === 'string') {
      text = request.contents;
    } else if (Array.isArray(request.contents)) {
      text = request.contents
        .flatMap((c: Content) => c.parts || [])
        .map((p: Part) => (p as { text: string }).text || '')
        .join(' ');
    }
    // Very rough approximation: ~4 characters per token
    const estimatedTokens = Math.ceil(text.length / 4);
    return {
      totalTokens: estimatedTokens,
    };
  }

  async embedContent(
    _request: EmbedContentParameters,
  ): Promise<EmbedContentResponse> {
    throw new Error('Embeddings not supported for providers');
  }

  /**
   * Preprocess content array for provider-specific requirements.
   * Handles tool response formatting differences between Gemini and other providers:
   * 1. Removes tool call echoes that immediately precede their responses (Gemini-only requirement)
   * 2. Splits messages with multiple tool responses into separate messages (Anthropic requirement)
   */
  private preprocessForProvider(contents: Content[]): Content[] {
    const processedContents: Content[] = [];

    for (let i = 0; i < contents.length; i++) {
      const content = contents[i];

      // Skip tool call echoes that are part of a paired call/response
      if (this.isToolCallEcho(content, contents[i + 1])) {
        continue;
      }

      // Split multiple tool responses into separate messages
      if (this.hasMultipleToolResponses(content)) {
        const toolResponseParts = this.extractToolResponseParts(content);
        for (const responsePart of toolResponseParts) {
          processedContents.push({
            role: 'user' as const,
            parts: [responsePart],
          });
        }
      } else {
        processedContents.push(content);
      }
    }

    return processedContents;
  }

  /**
   * Checks if a content is a tool call echo that should be filtered out.
   * An echo is a model message with a single function call that is immediately
   * followed by the matching function response from the tool executor.
   * Only Gemini API requires these echoes; other providers have the tool call in history.
   */
  private isToolCallEcho(
    content: Content,
    nextContent: Content | undefined,
  ): boolean {
    if (content.role !== 'model' || !this.hasSingleFunctionCall(content)) {
      return false;
    }

    if (!nextContent || !this.hasSingleFunctionResponse(nextContent)) {
      return false;
    }

    // Verify the IDs match between call and response
    const callId = this.getFunctionCallId(content);
    const responseId = this.getFunctionResponseId(nextContent);

    return callId !== undefined && callId === responseId;
  }

  /**
   * Checks if content has exactly one function call part.
   */
  private hasSingleFunctionCall(content: Content): boolean {
    return (
      content.parts?.length === 1 &&
      !!content.parts[0] &&
      typeof content.parts[0] === 'object' &&
      'functionCall' in content.parts[0]
    );
  }

  /**
   * Checks if content has exactly one function response part.
   */
  private hasSingleFunctionResponse(content: Content): boolean {
    return (
      content.role === 'user' &&
      content.parts?.length === 1 &&
      !!content.parts[0] &&
      typeof content.parts[0] === 'object' &&
      'functionResponse' in content.parts[0]
    );
  }

  /**
   * Extracts the function call ID from content.
   */
  private getFunctionCallId(content: Content): string | undefined {
    const part = content.parts?.[0];
    if (!part || typeof part !== 'object' || !('functionCall' in part)) {
      return undefined;
    }
    return (part as { functionCall?: { id?: string } }).functionCall?.id;
  }

  /**
   * Extracts the function response ID from content.
   */
  private getFunctionResponseId(content: Content): string | undefined {
    const part = content.parts?.[0];
    if (!part || typeof part !== 'object' || !('functionResponse' in part)) {
      return undefined;
    }
    return (part as { functionResponse?: { id?: string } }).functionResponse
      ?.id;
  }

  /**
   * Checks if content has multiple tool response parts.
   */
  private hasMultipleToolResponses(content: Content): boolean {
    if (content.role !== 'user' || !content.parts) {
      return false;
    }

    const toolResponseParts = this.extractToolResponseParts(content);
    return toolResponseParts.length > 1;
  }

  /**
   * Extracts all function response parts from content.
   */
  private extractToolResponseParts(content: Content): Part[] {
    if (!content.parts) {
      return [];
    }

    return content.parts.filter(
      (part) => part && typeof part === 'object' && 'functionResponse' in part,
    );
  }
}
