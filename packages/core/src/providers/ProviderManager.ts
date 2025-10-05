/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { IProvider } from './IProvider.js';
import type { IModel } from './IModel.js';
import type { IProviderManager } from './IProviderManager.js';
import type { Config } from '../config/config.js';
import { LoggingProviderWrapper } from './LoggingProviderWrapper.js';
import { getSettingsService } from '../settings/settingsServiceInstance.js';

/**
 * Minimal provider manager following Gemini's single-responsibility pattern
 * Manages provider registration and switching, with token tracking via LoggingProviderWrapper
 */
export class ProviderManager implements IProviderManager {
  private providers: Map<string, IProvider>;
  private serverToolsProvider: IProvider | null;
  private config?: Config;

  constructor() {
    this.providers = new Map<string, IProvider>();
    this.serverToolsProvider = null;
  }

  setConfig(config: Config): void {
    this.config = config;
  }

  registerProvider(provider: IProvider): void {
    // ALWAYS wrap with LoggingProviderWrapper for token tracking
    let wrappedProvider = provider;
    if (this.config) {
      wrappedProvider = new LoggingProviderWrapper(provider, this.config);
    }

    this.providers.set(provider.name, wrappedProvider);

    // If this is the default provider and no provider is active, set it as active
    const settingsService = getSettingsService();
    const currentActiveProvider = settingsService.get(
      'activeProvider',
    ) as string;
    if (provider.isDefault && !currentActiveProvider) {
      settingsService.set('activeProvider', provider.name);
    }

    // If registering Gemini and we don't have a serverToolsProvider, use it
    if (provider.name === 'gemini' && !this.serverToolsProvider) {
      this.serverToolsProvider = wrappedProvider;
    }

    // If Gemini is the active provider, it should also be the serverToolsProvider
    if (provider.name === 'gemini' && currentActiveProvider === 'gemini') {
      this.serverToolsProvider = wrappedProvider;
    }
  }

  setActiveProvider(name: string): void {
    if (!this.providers.has(name)) {
      throw new Error('Provider not found');
    }

    // Store reference to the current active provider before switching
    const settingsService = getSettingsService();
    const previousProviderName =
      (settingsService.get('activeProvider') as string) || '';

    // Only clear state from the provider we're switching FROM
    // BUT never clear the serverToolsProvider's state
    if (previousProviderName && previousProviderName !== name) {
      const previousProvider = this.providers.get(previousProviderName);
      if (previousProvider && previousProvider.clearState) {
        // Don't clear state if this provider is also the serverToolsProvider
        if (previousProvider !== this.serverToolsProvider) {
          previousProvider.clearState();
        }
      }
    }

    // Update SettingsService as the single source of truth
    settingsService.set('activeProvider', name);

    // If switching to Gemini, use it as both active and serverTools provider
    // BUT only if we don't already have a Gemini serverToolsProvider with auth state
    if (name === 'gemini') {
      // Only replace serverToolsProvider if it's not already Gemini or if it's null
      if (
        !this.serverToolsProvider ||
        this.serverToolsProvider.name !== 'gemini'
      ) {
        this.serverToolsProvider = this.providers.get(name) || null;
      }
    }
    // If switching away from Gemini but serverToolsProvider is not set,
    // configure a Gemini provider for serverTools if available
    else if (!this.serverToolsProvider && this.providers.has('gemini')) {
      this.serverToolsProvider = this.providers.get('gemini') || null;
    }
  }

  clearActiveProvider(): void {
    const settingsService = getSettingsService();
    settingsService.set('activeProvider', '');
  }

  getActiveProvider(): IProvider {
    const settingsService = getSettingsService();
    const activeProviderName =
      (settingsService.get('activeProvider') as string) || '';

    if (!activeProviderName) {
      throw new Error('No active provider set');
    }
    const provider = this.providers.get(activeProviderName);
    if (!provider) {
      throw new Error('Active provider not found');
    }
    return provider;
  }

  async getAvailableModels(providerName?: string): Promise<IModel[]> {
    let provider: IProvider | undefined;

    if (providerName) {
      provider = this.providers.get(providerName);
      if (!provider) {
        throw new Error(`Provider '${providerName}' not found`);
      }
    } else {
      provider = this.getActiveProvider();
    }

    return provider.getModels();
  }

  listProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Get a provider by name (for OAuth manager and config)
   */
  getProviderByName(name: string): IProvider | undefined {
    return this.providers.get(name);
  }

  getActiveProviderName(): string {
    const settingsService = getSettingsService();
    return (settingsService.get('activeProvider') as string) || '';
  }

  hasActiveProvider(): boolean {
    const settingsService = getSettingsService();
    const activeProviderName =
      (settingsService.get('activeProvider') as string) || '';
    return activeProviderName !== '' && this.providers.has(activeProviderName);
  }

  getServerToolsProvider(): IProvider | null {
    // If we have a configured serverToolsProvider, return it
    if (this.serverToolsProvider) {
      return this.serverToolsProvider;
    }

    // Otherwise, try to get Gemini if available
    const geminiProvider = this.providers.get('gemini');
    if (geminiProvider) {
      this.serverToolsProvider = geminiProvider;
      return geminiProvider;
    }

    return null;
  }

  setServerToolsProvider(provider: IProvider | null): void {
    this.serverToolsProvider = provider;
  }
}
