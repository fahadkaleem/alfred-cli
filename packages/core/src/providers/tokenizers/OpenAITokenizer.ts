/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { encoding_for_model } from '@dqbd/tiktoken';
import type { TiktokenModel } from '@dqbd/tiktoken';
import { DebugLogger } from '../../debug/DebugLogger.js';
import type { ITokenizer } from './ITokenizer.js';

export class OpenAITokenizer implements ITokenizer {
  private readonly logger = new DebugLogger('alfred:tokenizer:openai');
  private encoderCache = new Map<
    string,
    ReturnType<typeof encoding_for_model>
  >();

  async countTokens(text: string, model: string): Promise<number> {
    try {
      // Get or create encoder for the model
      let encoder = this.encoderCache.get(model);
      if (!encoder) {
        // Try to get encoder for the specific model
        try {
          encoder = encoding_for_model(model as TiktokenModel);
          this.encoderCache.set(model, encoder);
        } catch (_error) {
          // Fall back to o200k_base encoding for newer models
          this.logger['debug'](
            () => `No specific encoding for model ${model}, using o200k_base`,
          );
          encoder = encoding_for_model('gpt-4o-mini');
          this.encoderCache.set(model, encoder);
        }
      }

      // Count tokens
      const tokens = encoder.encode(text);
      return tokens.length;
    } catch (error) {
      console.error('Error counting tokens:', error);
      // Fallback: rough estimate based on characters
      return Math.ceil(text.length / 4);
    }
  }

  /**
   * Clean up encoder resources
   */
  dispose(): void {
    for (const encoder of this.encoderCache.values()) {
      encoder.free();
    }
    this.encoderCache.clear();
  }
}
