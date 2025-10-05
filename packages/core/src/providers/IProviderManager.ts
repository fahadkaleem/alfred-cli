/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { IProvider } from './IProvider.js';
import type { IModel } from './IModel.js';
import type { Config } from '../config/config.js';

/**
 * Manager for handling multiple providers
 */
export interface IProviderManager {
  /**
   * Set the configuration for the provider manager
   */
  setConfig(config: Config): void;
  /**
   * Register a provider
   */
  registerProvider(provider: IProvider): void;

  /**
   * Set the active provider by name
   */
  setActiveProvider(name: string): void;

  /**
   * Clear the active provider
   */
  clearActiveProvider(): void;

  /**
   * Check if a provider is currently active
   */
  hasActiveProvider(): boolean;

  /**
   * Get the currently active provider
   * @throws Error if no active provider is set
   */
  getActiveProvider(): IProvider;

  /**
   * Get the name of the active provider
   */
  getActiveProviderName(): string;

  /**
   * Get available models from a provider
   */
  getAvailableModels(providerName?: string): Promise<IModel[]>;

  /**
   * List all registered providers
   */
  listProviders(): string[];

  /**
   * Get the server tools provider (typically Gemini for web search)
   */
  getServerToolsProvider(): IProvider | null;

  /**
   * Set the server tools provider
   */
  setServerToolsProvider(provider: IProvider | null): void;

  /**
   * Get a provider by name (for OAuth manager and config)
   */
  getProviderByName(name: string): IProvider | undefined;
}
