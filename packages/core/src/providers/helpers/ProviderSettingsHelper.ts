/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Provider settings helper
 * Extracts settings logic from BaseProvider to enable composition over inheritance
 */

import { getSettingsService } from '../../settings/settingsServiceInstance.js';
import type { IProviderConfig } from '../types/IProviderConfig.js';

export class ProviderSettingsHelper {
  protected providerName: string;
  protected providerConfig?: IProviderConfig;
  protected baseURL?: string;

  constructor(
    providerName: string,
    providerConfig?: IProviderConfig,
    baseURL?: string,
  ) {
    this.providerName = providerName;
    this.providerConfig = providerConfig;
    this.baseURL = baseURL;
  }

  /**
   * Gets the base URL with proper precedence:
   * 1. Ephemeral settings (highest priority - from /baseurl or profile)
   * 2. Provider config (from IProviderConfig)
   * 3. Base URL from constructor
   * 4. undefined (use provider default)
   */
  getBaseURL(): string | undefined {
    const settingsService = getSettingsService();

    // 1. Check ephemeral settings first (from /baseurl command or profile)
    const ephemeralBaseUrl = settingsService.get('base-url') as
      | string
      | undefined;
    if (ephemeralBaseUrl && ephemeralBaseUrl !== 'none') {
      return ephemeralBaseUrl;
    }

    // 2. Check provider config (from IProviderConfig)
    if (this.providerConfig?.baseUrl) {
      return this.providerConfig.baseUrl;
    }

    // 3. Check base URL from constructor
    if (this.baseURL) {
      return this.baseURL;
    }

    // 4. Return undefined to use provider's default
    return undefined;
  }

  /**
   * Updates the base URL in ephemeral settings
   * NOTE: Caller should also call authHelper.clearCache() after this
   */
  setBaseUrl(baseUrl?: string): void {
    const settingsService = getSettingsService();

    // Store in ephemeral settings as the highest priority source
    if (!baseUrl || baseUrl.trim() === '' || baseUrl === 'none') {
      // Clear the ephemeral setting
      settingsService.set('base-url', undefined);
    } else {
      settingsService.set('base-url', baseUrl);
    }
  }

  /**
   * Gets the current model with proper precedence:
   * 1. Ephemeral settings (highest priority)
   * 2. Provider-specific settings in SettingsService
   * 3. Provider config
   * 4. Default model (passed as parameter)
   */
  getModel(defaultModel: string): string {
    const settingsService = getSettingsService();

    // 1. Check ephemeral settings first
    const ephemeralModel = settingsService.get('model') as string | undefined;
    if (ephemeralModel) {
      return ephemeralModel;
    }

    // 2. Check provider-specific settings
    const providerSettings = settingsService.getProviderSettings(
      this.providerName,
    );
    const providerModel = providerSettings?.['model'] as string | undefined;
    if (providerModel) {
      return providerModel;
    }

    // 3. Check provider config
    if (this.providerConfig?.defaultModel) {
      return this.providerConfig.defaultModel;
    }

    // 4. Return default
    return defaultModel;
  }

  /**
   * Sets the model in provider-specific settings
   */
  setModel(modelId: string): void {
    const settingsService = getSettingsService();
    settingsService.setProviderSetting(this.providerName, 'model', modelId);
  }

  /**
   * Gets model parameters from SettingsService
   * Note: This method uses synchronous access to settings via getProviderSettings
   */
  getModelParams(): Record<string, unknown> | undefined {
    const settingsService = getSettingsService();

    try {
      // Use getProviderSettings which is synchronous
      const settings = settingsService.getProviderSettings(this.providerName);

      if (!settings) {
        return undefined;
      }

      // Extract model parameters from settings, excluding standard fields
      const {
        enabled: _enabled,
        apiKey: _apiKey,
        baseUrl: _baseUrl,
        model: _model,
        maxTokens,
        temperature,
        ...modelParams
      } = settings as {
        enabled?: boolean;
        apiKey?: string;
        baseUrl?: string;
        model?: string;
        maxTokens?: number;
        temperature?: number;
        [key: string]: unknown;
      };

      // Include temperature and maxTokens as model params if they exist
      const params: Record<string, unknown> = {};
      if (temperature !== undefined) params['temperature'] = temperature;
      if (maxTokens !== undefined) params['max_tokens'] = maxTokens;

      return Object.keys(params).length > 0 ||
        Object.keys(modelParams).length > 0
        ? { ...params, ...modelParams }
        : undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Sets model parameters in SettingsService
   */
  setModelParams(params: Record<string, unknown> | undefined): void {
    const settingsService = getSettingsService();

    try {
      if (params === undefined) {
        // Clear model parameters by setting them to undefined
        settingsService.updateSettings(this.providerName, {
          temperature: undefined,
          maxTokens: undefined,
        });
        return;
      }

      // Convert standard model params to settings format
      const updates: Record<string, unknown> = {};
      if ('temperature' in params)
        updates['temperature'] = params['temperature'];
      if ('max_tokens' in params) updates['maxTokens'] = params['max_tokens'];
      if ('maxTokens' in params) updates['maxTokens'] = params['maxTokens'];

      // Store other parameters as custom fields
      for (const [key, value] of Object.entries(params)) {
        if (!['temperature', 'max_tokens', 'maxTokens'].includes(key)) {
          updates[key] = value;
        }
      }

      if (Object.keys(updates).length > 0) {
        settingsService.updateSettings(this.providerName, updates);
      }
    } catch {
      // Silently fail - settings are not critical
    }
  }

  /**
   * Updates the provider config
   */
  setConfig(config: IProviderConfig): void {
    this.providerConfig = config;
  }
}
