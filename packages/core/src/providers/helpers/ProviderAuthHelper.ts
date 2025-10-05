/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Provider authentication helper
 * Extracts auth logic from BaseProvider to enable composition over inheritance
 */

import { AuthPrecedenceResolver } from '../../auth/precedence.js';
import type {
  AuthPrecedenceConfig,
  OAuthManager,
} from '../../auth/precedence.js';
import { getSettingsService } from '../../settings/settingsServiceInstance.js';

export class ProviderAuthHelper {
  protected authResolver: AuthPrecedenceResolver;
  protected cachedAuthToken?: string;
  protected authCacheTimestamp?: number;
  protected readonly AUTH_CACHE_DURATION = 60000; // 1 minute in milliseconds
  protected providerName: string;

  constructor(
    providerName: string,
    envKeyNames: string[],
    supportsOAuth: boolean,
    oauthProvider?: string,
    oauthManager?: OAuthManager,
    initialApiKey?: string,
  ) {
    this.providerName = providerName;

    // If an initial apiKey is provided, store it in provider-specific SettingsService key
    // Use provider-specific key to avoid conflicts between multiple providers
    // Only store non-empty API keys to ensure proper precedence fallback
    if (initialApiKey && initialApiKey.trim() !== '') {
      const settingsService = getSettingsService();
      const providerSpecificKey = `${providerName}-auth-key`;
      settingsService.set(providerSpecificKey, initialApiKey);
    }

    // Initialize auth precedence resolver
    const precedenceConfig: AuthPrecedenceConfig = {
      providerName,
      envKeyNames,
      isOAuthEnabled: !!oauthManager,
      supportsOAuth,
      oauthProvider,
    };

    this.authResolver = new AuthPrecedenceResolver(
      precedenceConfig,
      oauthManager,
    );
  }

  /**
   * Gets authentication token using the precedence chain
   * This method implements lazy OAuth triggering - only triggers OAuth when actually making API calls
   * Returns empty string if no auth is available (for local/self-hosted endpoints)
   */
  async getToken(): Promise<string> {
    // Check cache first (short-lived cache to avoid repeated OAuth calls)
    if (
      this.cachedAuthToken &&
      this.authCacheTimestamp &&
      Date.now() - this.authCacheTimestamp < this.AUTH_CACHE_DURATION
    ) {
      return this.cachedAuthToken;
    }

    // Clear stale cache
    this.cachedAuthToken = undefined;
    this.authCacheTimestamp = undefined;

    // Resolve authentication using precedence chain
    const token = await this.authResolver.resolveAuthentication();

    if (!token) {
      // Return empty string for local/self-hosted endpoints that don't require auth
      // Individual providers can decide how to handle this
      return '';
    }

    // Cache the token briefly
    this.cachedAuthToken = token;
    this.authCacheTimestamp = Date.now();

    if (process.env['DEBUG']) {
      const authMethod = await this.authResolver.getAuthMethodName();
      console.log(
        `[${this.providerName}] Authentication resolved using: ${authMethod}`,
      );
    }

    return token;
  }

  /**
   * Gets the current authentication method name for debugging
   */
  async getAuthMethodName(): Promise<string | null> {
    return this.authResolver.getAuthMethodName();
  }

  /**
   * Checks if the provider is authenticated using any available method
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      const token = await this.authResolver.resolveAuthentication();
      return token !== null;
    } catch {
      return false;
    }
  }

  /**
   * Checks if authentication is available without triggering OAuth
   */
  async hasNonOAuthAuthentication(): Promise<boolean> {
    return this.authResolver.hasNonOAuthAuthentication();
  }

  /**
   * Checks if OAuth is the only available authentication method
   */
  async isOAuthOnlyAvailable(): Promise<boolean> {
    return this.authResolver.isOAuthOnlyAvailable();
  }

  /**
   * Updates the API key (used for CLI --key argument and other sources)
   */
  setApiKey(apiKey: string): void {
    const settingsService = getSettingsService();

    // CRITICAL FIX: When clearing the key, set to undefined instead of empty string
    // This ensures the precedence chain properly skips this level
    if (!apiKey || apiKey.trim() === '') {
      settingsService.set('auth-key', undefined);
    } else {
      settingsService.set('auth-key', apiKey);
    }

    this.clearCache();
  }

  /**
   * Clears authentication (used when removing keys/keyfiles)
   */
  clearAuth(): void {
    const settingsService = getSettingsService();
    settingsService.set('auth-key', undefined);
    settingsService.set('auth-keyfile', undefined);
    this.clearCache();
  }

  /**
   * Updates OAuth configuration
   */
  updateOAuthConfig(
    isEnabled: boolean,
    supportsOAuth: boolean,
    provider?: string,
    manager?: OAuthManager,
  ): void {
    this.authResolver.updateConfig({
      isOAuthEnabled: isEnabled,
      supportsOAuth,
      oauthProvider: provider,
    });

    if (manager) {
      this.authResolver.updateOAuthManager(manager);
    }

    this.clearCache();
  }

  /**
   * Clears the authentication token cache
   */
  clearCache(): void {
    this.cachedAuthToken = undefined;
    this.authCacheTimestamp = undefined;
  }
}
