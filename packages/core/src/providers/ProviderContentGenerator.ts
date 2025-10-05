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
   * Preprocess content array for provider-specific requirements
   * Handles tool response formatting differences between Gemini and other providers
   */
  private preprocessForProvider(contents: Content[]): Content[] {
    const processedContents: Content[] = [];

    for (const content of contents) {
      // Check for paired tool call/response pattern from alfredChat
      // This occurs when tool executor sends [functionCall, functionResponse] array
      const isPairedToolEcho =
        content.role === 'model' &&
        content.parts?.length === 1 &&
        content.parts[0] &&
        typeof content.parts[0] === 'object' &&
        'functionCall' in content.parts[0];

      if (isPairedToolEcho) {
        // Skip the echo of tool call - providers already have it in history
        // Only Gemini API needs this echo
        continue;
      }

      // Check for multiple tool responses in a single message
      if (content.role === 'user' && content.parts) {
        const toolResponseParts = content.parts.filter(
          (part) =>
            part && typeof part === 'object' && 'functionResponse' in part,
        );

        if (toolResponseParts.length > 1) {
          // Multiple tool responses - split into separate messages for providers
          // Anthropic requires each tool response in a separate message
          for (const responsePart of toolResponseParts) {
            processedContents.push({
              role: 'user' as const,
              parts: [responsePart],
            });
          }
        } else {
          // Single tool response or regular message - keep as-is
          processedContents.push(content);
        }
      } else {
        // Regular message - keep as-is
        processedContents.push(content);
      }
    }

    return processedContents;
  }
}
