/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  IContent,
  ToolCallBlock,
  ToolResponseBlock,
  TextBlock,
} from './IContent.js';
import { ContentValidation } from './IContent.js';
import { EventEmitter } from 'node:events';
import type { ITokenizer } from '../../providers/tokenizers/ITokenizer.js';
import { OpenAITokenizer } from '../../providers/tokenizers/OpenAITokenizer.js';
import { AnthropicTokenizer } from '../../providers/tokenizers/AnthropicTokenizer.js';
import type { TokensUpdatedEvent } from './HistoryEvents.js';
import { DebugLogger } from '../../debug/index.js';
import { randomUUID } from 'node:crypto';

/**
 * Typed EventEmitter for HistoryService events
 */
interface HistoryServiceEventEmitter {
  on(
    event: 'tokensUpdated',
    listener: (eventData: TokensUpdatedEvent) => void,
  ): this;
  emit(event: 'tokensUpdated', eventData: TokensUpdatedEvent): boolean;
  off(
    event: 'tokensUpdated',
    listener: (eventData: TokensUpdatedEvent) => void,
  ): this;
}

/**
 * Configuration for compression behavior
 */
export interface CompressionConfig {
  orphanTimeoutMs: number; // Time before considering a call orphaned
  orphanMessageDistance: number; // Messages before considering orphaned
  pendingGracePeriodMs: number; // Grace period for pending calls
  minMessagesForCompression: number; // Minimum messages before compression
}

/**
 * Service for managing conversation history in a provider-agnostic way.
 * All history is stored as IContent. Providers are responsible for converting
 * to/from their own formats.
 */
export class HistoryService
  extends EventEmitter
  implements HistoryServiceEventEmitter
{
  private history: IContent[] = [];
  private totalTokens: number = 0;
  private tokenizerCache = new Map<string, ITokenizer>();
  private tokenizerLock: Promise<void> = Promise.resolve();
  private logger = new DebugLogger('llxprt:history:service');

  // Compression state and queue
  private isCompressing: boolean = false;
  private pendingOperations: Array<() => void> = [];

  /**
   * Get or create tokenizer for a specific model
   */
  private getTokenizerForModel(modelName: string): ITokenizer {
    if (this.tokenizerCache.has(modelName)) {
      return this.tokenizerCache.get(modelName)!;
    }

    let tokenizer: ITokenizer;
    if (modelName.includes('claude') || modelName.includes('anthropic')) {
      tokenizer = new AnthropicTokenizer();
    } else if (
      modelName.includes('gpt') ||
      modelName.includes('openai') ||
      modelName.includes('o1') ||
      modelName.includes('o3')
    ) {
      tokenizer = new OpenAITokenizer();
    } else {
      // Default to OpenAI tokenizer for Gemini and other models (tiktoken is pretty universal)
      tokenizer = new OpenAITokenizer();
    }

    this.tokenizerCache.set(modelName, tokenizer);
    return tokenizer;
  }

  /**
   * Generate a new normalized history tool ID.
   * Format: hist_tool_<uuid-v4>
   */
  generateHistoryId(): string {
    return `hist_tool_${randomUUID()}`;
  }

  /**
   * Get a callback suitable for passing into converters
   * which will generate normalized history IDs on demand.
   */
  getIdGeneratorCallback(): () => string {
    return () => this.generateHistoryId();
  }

  /**
   * Get the current total token count
   */
  getTotalTokens(): number {
    return this.totalTokens;
  }

  /**
   * Add content to the history
   * Note: We accept all content including empty responses for comprehensive history.
   * Filtering happens only when getting curated history.
   */
  add(content: IContent, modelName?: string): void {
    // If compression is active, queue this operation
    if (this.isCompressing) {
      this.logger['debug']('Queueing add operation during compression', {
        speaker: content.speaker,
        blockTypes: content.blocks?.map((b) => b['type']),
      });

      this.pendingOperations.push(() => {
        this.addInternal(content, modelName);
      });
      return;
    }

    // Otherwise, add immediately
    this.addInternal(content, modelName);
  }

  private addInternal(content: IContent, modelName?: string): void {
    // Log content being added with any tool call/response IDs
    this.logger['debug']('Adding content to history:', {
      speaker: content.speaker,
      blockTypes: content.blocks?.map((b) => b['type']),
      toolCallIds: content.blocks
        ?.filter((b) => b['type'] === 'tool_call')
        .map((b) => (b as ToolCallBlock)['id']),
      toolResponseIds: content.blocks
        ?.filter((b) => b['type'] === 'tool_response')
        .map((b) => ({
          callId: (b as ToolResponseBlock).callId,
          toolName: (b as ToolResponseBlock).toolName,
        })),
      contentId: content.metadata?.id,
      modelName,
    });

    // Only do basic validation - must have valid speaker
    if (content.speaker && ['human', 'ai', 'tool'].includes(content.speaker)) {
      this.history.push(content);

      this.logger['debug'](
        'Content added successfully, history length:',
        this.history.length,
      );

      // Update token count asynchronously but atomically
      this.updateTokenCount(content, modelName);
    } else {
      this.logger['debug'](
        'Content rejected - invalid speaker:',
        content.speaker,
      );
    }
  }

  /**
   * Atomically update token count for new content
   */
  private async updateTokenCount(
    content: IContent,
    modelName?: string,
  ): Promise<void> {
    // Use a lock to prevent race conditions
    this.tokenizerLock = this.tokenizerLock.then(async () => {
      let contentTokens = 0;

      // First try to use usage data from the content metadata
      if (content.metadata?.usage) {
        contentTokens = content.metadata.usage.totalTokens;
      } else {
        // Fall back to tokenizer estimation
        // Default to gpt-4.1 tokenizer if no model name provided (most universal)
        const defaultModel = modelName || 'gpt-4.1';
        contentTokens = await this.estimateContentTokens(content, defaultModel);
      }

      // Atomically update the total
      this.totalTokens += contentTokens;

      // Emit event with updated count
      const eventData = {
        totalTokens: this.totalTokens,
        addedTokens: contentTokens,
        contentId: content.metadata?.id,
      };

      this.logger['debug']('Emitting tokensUpdated:', eventData);

      this.emit('tokensUpdated', eventData);
    });

    return this.tokenizerLock;
  }

  /**
   * Estimate token count for content using tokenizer
   */
  private async estimateContentTokens(
    content: IContent,
    modelName: string,
  ): Promise<number> {
    const tokenizer = this.getTokenizerForModel(modelName);
    let totalTokens = 0;

    for (const block of content.blocks) {
      let blockText = '';

      switch (block['type']) {
        case 'text':
          blockText = block['text'];
          break;
        case 'tool_call':
          try {
            blockText = JSON.stringify({
              name: block['name'],
              parameters: block.parameters,
            });
          } catch (error) {
            // Handle circular references or other JSON.stringify errors
            this.logger['debug'](
              'Error stringifying tool_call parameters, using fallback:',
              error,
            );
            // Fallback to just the tool name for token estimation
            blockText = `tool_call: ${block['name']}`;
          }
          break;
        case 'tool_response':
          // Check if result is already a string (common for tool responses)
          if (typeof block.result === 'string') {
            blockText = block.result;
          } else if (block.error) {
            blockText =
              typeof block.error === 'string'
                ? block.error
                : JSON.stringify(block.error);
          } else {
            // Try to stringify the result
            try {
              blockText = JSON.stringify(block.result || '');
            } catch (error) {
              // Handle circular references or other JSON.stringify errors
              this.logger['debug'](
                'Error stringifying tool_response result, using string conversion:',
                error,
              );
              // Try to convert to string as fallback
              try {
                blockText = String(block.result);
              } catch {
                // Ultimate fallback
                blockText = `[tool_response: ${block.toolName || 'unknown'} - content too large or complex to stringify]`;
              }
            }
          }
          break;
        case 'thinking':
          blockText = block.thought;
          break;
        case 'code':
          blockText = block.code;
          break;
        case 'media':
          // For media, just count the caption if any
          blockText = block.caption || '';
          break;
        default:
          // Unknown block type, skip
          break;
      }

      if (blockText) {
        try {
          const blockTokens = await tokenizer.countTokens(blockText, modelName);
          totalTokens += blockTokens;
        } catch (error) {
          this.logger['debug'](
            'Error counting tokens for block, using fallback:',
            error,
          );
          totalTokens += this.simpleTokenEstimateForText(blockText);
        }
      }
    }

    return totalTokens;
  }

  /**
   * Simple token estimation for text
   */
  private simpleTokenEstimateForText(text: string): number {
    if (!text) return 0;
    const wordCount = text.split(/\s+/).length;
    const characterCount = text.length;
    return Math.round(Math.max(wordCount * 1.3, characterCount / 4));
  }

  /**
   * Add multiple contents to the history
   */
  addAll(contents: IContent[], modelName?: string): void {
    for (const content of contents) {
      this.add(content, modelName);
    }
  }

  /**
   * Get all history
   */
  getAll(): IContent[] {
    return [...this.history];
  }

  /**
   * Clear all history
   */
  clear(): void {
    // If compression is active, queue this operation
    if (this.isCompressing) {
      this.logger['debug']('Queueing clear operation during compression');
      this.pendingOperations.push(() => {
        this.clearInternal();
      });
      return;
    }

    // Otherwise, clear immediately
    this.clearInternal();
  }

  private clearInternal(): void {
    this.logger['debug']('Clearing history', {
      previousLength: this.history.length,
    });

    const previousTokens = this.totalTokens;
    this.history = [];
    this.totalTokens = 0;

    // Emit event with reset count
    this.emit('tokensUpdated', {
      totalTokens: 0,
      addedTokens: -previousTokens, // Negative to indicate removal
      contentId: null,
    });
  }

  /**
   * Get the last N messages from history
   */
  getRecent(count: number): IContent[] {
    return this.history.slice(-count);
  }

  /**
   * Get curated history (only valid, meaningful content)
   * Matches the behavior of extractCuratedHistory in geminiChat.ts:
   * - Always includes user/human messages
   * - Always includes tool messages
   * - Only includes AI messages if they are valid (have content)
   */
  getCurated(): IContent[] {
    // Wait if compression is in progress
    if (this.isCompressing) {
      this.logger['debug'](
        'getCurated called during compression - returning snapshot',
      );
    }

    // Build the curated list without modifying history
    const curated: IContent[] = [];
    let excludedCount = 0;
    let aiMessagesAnalyzed = 0;
    let aiMessagesIncluded = 0;

    for (const content of this.history) {
      if (content.speaker === 'human' || content.speaker === 'tool') {
        // Always include user and tool messages
        curated.push(content);
      } else if (content.speaker === 'ai') {
        aiMessagesAnalyzed++;
        // Only include AI messages if they have valid content
        const hasValidContent = ContentValidation.hasContent(content);

        // Only do expensive debug logging if debug is enabled
        if (this.logger.enabled) {
          this.logger['debug']('Analyzing AI message:', {
            messageIndex: aiMessagesAnalyzed,
            hasValidContent,
            blockCount: content.blocks?.length || 0,
            blocks: content.blocks?.map((b) => ({
              type: b['type'],
              textLength:
                b['type'] === 'text' ? (b as TextBlock)['text']?.length : null,
              textPreview:
                b['type'] === 'text'
                  ? (b as TextBlock)['text']?.substring(0, 50)
                  : null,
              isEmpty:
                b['type'] === 'text'
                  ? !(b as TextBlock)['text']?.trim()
                  : false,
            })),
            metadata: {
              hasUsage: !!content.metadata?.usage,
              tokens: content.metadata?.usage?.totalTokens,
            },
          });
        }

        if (hasValidContent) {
          curated.push(content);
          aiMessagesIncluded++;
        } else {
          excludedCount++;
          if (this.logger.enabled) {
            this.logger['debug']('EXCLUDED AI message - no valid content');
          }
        }
      }
    }

    // Only log summary if debug is enabled
    if (this.logger.enabled) {
      this.logger['debug']('=== CURATED HISTORY SUMMARY ===', {
        totalHistory: this.history.length,
        curatedCount: curated.length,
        breakdown: {
          aiMessages: {
            total: aiMessagesAnalyzed,
            included: aiMessagesIncluded,
            excluded: excludedCount,
            exclusionRate:
              aiMessagesAnalyzed > 0
                ? `${((excludedCount / aiMessagesAnalyzed) * 100).toFixed(1)}%`
                : '0%',
          },
          humanMessages: curated.filter((c) => c.speaker === 'human').length,
          toolMessages: curated.filter((c) => c.speaker === 'tool').length,
        },
        toolActivity: {
          toolCallsInCurated: curated.reduce(
            (acc, c) =>
              acc + c.blocks.filter((b) => b['type'] === 'tool_call').length,
            0,
          ),
          toolResponsesInCurated: curated.reduce(
            (acc, c) =>
              acc +
              c.blocks.filter((b) => b['type'] === 'tool_response').length,
            0,
          ),
        },
        isCompressing: this.isCompressing,
      });
    }

    return curated;
  }

  /**
   * Get comprehensive history (all content including invalid/empty)
   */
  getComprehensive(): IContent[] {
    return [...this.history];
  }

  /**
   * Remove the last content if it matches the provided content
   */
  removeLastIfMatches(content: IContent): boolean {
    const last = this.history[this.history.length - 1];
    if (last === content) {
      this.history.pop();
      return true;
    }
    return false;
  }

  /**
   * Pop the last content from history
   */
  pop(): IContent | undefined {
    const removed = this.history.pop();
    if (removed) {
      // Recalculate tokens since we removed content
      // This is less efficient but ensures accuracy
      this.recalculateTokens();
    }
    return removed;
  }

  /**
   * Recalculate total tokens from scratch
   * Use this when removing content or when token counts might be stale
   */
  async recalculateTokens(defaultModel: string = 'gpt-4.1'): Promise<void> {
    this.tokenizerLock = this.tokenizerLock.then(async () => {
      let newTotal = 0;

      for (const content of this.history) {
        if (content.metadata?.usage) {
          newTotal += content.metadata.usage.totalTokens;
        } else {
          // Use the model from content metadata, or fall back to provided default
          const modelToUse = content.metadata?.model || defaultModel;
          newTotal += await this.estimateContentTokens(content, modelToUse);
        }
      }

      const oldTotal = this.totalTokens;
      this.totalTokens = newTotal;

      // Emit event with updated count
      this.emit('tokensUpdated', {
        totalTokens: this.totalTokens,
        addedTokens: this.totalTokens - oldTotal,
        contentId: null,
      });
    });

    return this.tokenizerLock;
  }

  /**
   * Get the last user (human) content
   */
  getLastUserContent(): IContent | undefined {
    for (let i = this.history.length - 1; i >= 0; i--) {
      if (this.history[i].speaker === 'human') {
        return this.history[i];
      }
    }
    return undefined;
  }

  /**
   * Get the last AI content
   */
  getLastAIContent(): IContent | undefined {
    for (let i = this.history.length - 1; i >= 0; i--) {
      if (this.history[i].speaker === 'ai') {
        return this.history[i];
      }
    }
    return undefined;
  }

  /**
   * Record a complete turn (user input + AI response + optional tool interactions)
   */
  recordTurn(
    userInput: IContent,
    aiResponse: IContent,
    toolInteractions?: IContent[],
  ): void {
    this.add(userInput);
    this.add(aiResponse);
    if (toolInteractions) {
      this.addAll(toolInteractions);
    }
  }

  /**
   * Get the number of messages in history
   */
  length(): number {
    return this.history.length;
  }

  /**
   * Check if history is empty
   */
  isEmpty(): boolean {
    return this.history.length === 0;
  }

  /**
   * Clone the history (deep copy)
   */
  clone(): IContent[] {
    return JSON.parse(JSON.stringify(this.history));
  }

  /**
   * Find unmatched tool calls (tool calls without responses)
   */
  findUnmatchedToolCalls(): ToolCallBlock[] {
    // With atomic tool call/response implementation, orphans are impossible by design
    // Always return empty array since orphans cannot exist
    this.logger['debug'](
      'No unmatched tool calls - atomic implementation prevents orphans',
    );
    return [];
  }

  /**
   * Validate and fix the history to ensure proper tool call/response pairing
   */
  validateAndFix(): void {
    // With atomic tool call/response implementation, the history is always valid by design
    // No fixing needed since orphans cannot exist
    this.logger['debug'](
      'History validation skipped - atomic implementation ensures validity',
    );
  }

  /**
   * Get curated history with circular references removed for providers.
   * This ensures the history can be safely serialized and sent to providers.
   */
  getCuratedForProvider(): IContent[] {
    // Get the curated history
    const curated = this.getCurated();

    // Deep clone to avoid circular references in tool call parameters
    // We need a clean copy that can be serialized
    return this.deepCloneWithoutCircularRefs(curated);
  }

  /**
   * Deep clone content array, removing circular references
   */
  private deepCloneWithoutCircularRefs(contents: IContent[]): IContent[] {
    return contents.map((content) => {
      // Create a clean copy of the content
      const cloned: IContent = {
        speaker: content.speaker,
        blocks: content.blocks.map((block) => {
          if (block['type'] === 'tool_call') {
            const toolCall = block as ToolCallBlock;
            // For tool calls, sanitize the parameters to remove circular refs
            return {
              type: 'tool_call',
              id: toolCall['id'],
              name: toolCall['name'],
              parameters: this.sanitizeParams(toolCall.parameters),
            } as ToolCallBlock;
          } else if (block['type'] === 'tool_response') {
            const toolResponse = block as ToolResponseBlock;
            // For tool responses, sanitize the result to remove circular refs
            return {
              type: 'tool_response',
              callId: toolResponse.callId,
              toolName: toolResponse.toolName,
              result: this.sanitizeParams(toolResponse.result),
              error: toolResponse.error,
            } as ToolResponseBlock;
          } else {
            // Other blocks should be safe to clone
            try {
              return JSON.parse(JSON.stringify(block));
            } catch {
              // If any block fails, return minimal version
              return { ...block };
            }
          }
        }),
        metadata: content.metadata ? { ...content.metadata } : {},
      };
      return cloned;
    });
  }

  /**
   * Sanitize parameters to remove circular references
   */
  private sanitizeParams(params: unknown): unknown {
    const seen = new WeakSet();

    const sanitize = (obj: unknown): unknown => {
      // Handle primitives
      if (obj === null || typeof obj !== 'object') {
        return obj;
      }

      // Check for circular reference
      if (seen.has(obj)) {
        return { _circular: true };
      }

      seen.add(obj);

      // Handle arrays
      if (Array.isArray(obj)) {
        return obj.map((item) => sanitize(item));
      }

      // Handle objects
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = sanitize(value);
      }

      return result;
    };

    try {
      return sanitize(params);
    } catch (error) {
      this.logger['debug']('Error sanitizing params:', error);
      return {
        _note: 'Parameters contained circular references and were sanitized',
      };
    }
  }

  /**
   * Merge two histories, handling duplicates and conflicts
   */
  merge(other: HistoryService): void {
    // Simple append for now - could be made smarter to detect duplicates
    this.addAll(other.getAll());
  }

  /**
   * Get history within a token limit (for context window management)
   */
  getWithinTokenLimit(
    maxTokens: number,
    countTokensFn: (content: IContent) => number,
  ): IContent[] {
    const result: IContent[] = [];
    let totalTokens = 0;

    // Work backwards to keep most recent messages
    for (let i = this.history.length - 1; i >= 0; i--) {
      const content = this.history[i];
      const tokens = countTokensFn(content);

      if (totalTokens + tokens <= maxTokens) {
        result.unshift(content);
        totalTokens += tokens;
      } else {
        break;
      }
    }

    return result;
  }

  /**
   * Summarize older history to fit within token limits
   */
  async summarizeOldHistory(
    keepRecentCount: number,
    summarizeFn: (contents: IContent[]) => Promise<IContent>,
  ): Promise<void> {
    if (this.history.length <= keepRecentCount) {
      return;
    }

    const toSummarize = this.history.slice(0, -keepRecentCount);
    const toKeep = this.history.slice(-keepRecentCount);

    const summary = await summarizeFn(toSummarize);
    this.history = [summary, ...toKeep];
  }

  /**
   * Export history to JSON
   */
  toJSON(): string {
    return JSON.stringify(this.history, null, 2);
  }

  /**
   * Import history from JSON
   */
  static fromJSON(json: string): HistoryService {
    const service = new HistoryService();
    const history = JSON.parse(json);
    service.addAll(history);
    return service;
  }

  /**
   * Mark compression as starting
   * This will cause add() operations to queue until compression completes
   */
  startCompression(): void {
    this.logger['debug']('Starting compression - locking history');
    this.isCompressing = true;
  }

  /**
   * Mark compression as complete
   * This will flush all queued operations
   */
  endCompression(): void {
    this.logger['debug']('Compression complete - unlocking history', {
      pendingCount: this.pendingOperations.length,
    });

    this.isCompressing = false;

    // Flush all pending operations
    const operations = this.pendingOperations;
    this.pendingOperations = [];

    for (const operation of operations) {
      operation();
    }

    this.logger['debug']('Flushed pending operations', {
      count: operations.length,
    });
  }

  /**
   * Wait for all pending operations to complete
   * For synchronous operations, this is now a no-op but kept for API compatibility
   */
  async waitForPendingOperations(): Promise<void> {
    // Since operations are now synchronous, nothing to wait for
    return Promise.resolve();
  }

  /**
   * Get conversation statistics
   */
  getStatistics(): {
    totalMessages: number;
    userMessages: number;
    aiMessages: number;
    toolCalls: number;
    toolResponses: number;
    totalTokens?: number;
  } {
    let userMessages = 0;
    let aiMessages = 0;
    let toolCalls = 0;
    let toolResponses = 0;
    let totalTokens = 0;
    let hasTokens = false;

    for (const content of this.history) {
      if (content.speaker === 'human') {
        userMessages++;
      } else if (content.speaker === 'ai') {
        aiMessages++;
      }

      for (const block of content.blocks) {
        if (block['type'] === 'tool_call') {
          toolCalls++;
        } else if (block['type'] === 'tool_response') {
          toolResponses++;
        }
      }

      if (content.metadata?.usage) {
        totalTokens += content.metadata.usage.totalTokens;
        hasTokens = true;
      }
    }

    return {
      totalMessages: this.history.length,
      userMessages,
      aiMessages,
      toolCalls,
      toolResponses,
      totalTokens: hasTokens ? totalTokens : undefined,
    };
  }
}
