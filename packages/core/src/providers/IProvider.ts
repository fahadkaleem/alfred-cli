/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { IModel } from './IModel.js';
import type { ITool } from './ITool.js';
import type { IContent } from '../services/history/IContent.js';

export interface IProvider {
  name: string;
  isDefault?: boolean;
  getModels(): Promise<IModel[]>;
  generateChatCompletion(
    content: IContent[],
    tools?: Array<{
      functionDeclarations: Array<{
        name: string;
        description?: string;
        parametersJsonSchema?: unknown;
      }>;
    }>,
  ): AsyncIterableIterator<IContent>;
  setModel?(modelId: string): void;
  getCurrentModel?(): string;
  getDefaultModel(): string;
  // Methods for updating provider configuration
  setApiKey?(apiKey: string): void;
  setBaseUrl?(baseUrl?: string): void;
  getToolFormat?(): string;
  setToolFormatOverride?(format: string | null): void;
  isPaidMode?(): boolean;
  // Method to clear any provider-specific state (e.g., conversation cache, tool call tracking)
  clearState?(): void;
  // Method to set the config instance (for providers that need it)
  setConfig?(config: unknown): void;
  // ServerTool methods for provider-native tools
  getServerTools(): string[];
  invokeServerTool(
    toolName: string,
    params: unknown,
    config?: unknown,
  ): Promise<unknown>;
  // Add other methods as needed, e.g., generateCompletion, getToolDefinitions

  /**
   * Set model parameters to be included in API calls
   * @param params Parameters to merge with existing, or undefined to clear all
   */
  setModelParams?(params: Record<string, unknown> | undefined): void;

  /**
   * Get current model parameters
   * @returns Current parameters or undefined if not set
   */
  getModelParams?(): Record<string, unknown> | undefined;

  /**
   * Clear authentication cache (for OAuth logout)
   */
  clearAuthCache?(): void;

  /**
   * Clear authentication settings (keys and keyfiles)
   */
  clearAuth?(): void;
}

// Re-export the interfaces for convenience
export type { IModel, ITool };
