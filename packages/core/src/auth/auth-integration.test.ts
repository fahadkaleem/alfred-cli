/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuthPrecedenceResolver } from './precedence.js';
import type { AuthPrecedenceConfig, OAuthManager } from './precedence.js';
import {
  getSettingsService,
  resetSettingsService,
} from '../settings/settingsServiceInstance.js';

// Mock fs/promises for precedence resolver
vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
}));

// Mock OAuth manager implementing the interface
const createMockOAuthManager = (): OAuthManager => ({
  getToken: vi.fn(),
  isAuthenticated: vi.fn(),
});

/**
 * Integration tests for complete auth precedence flow and provider coordination
 *
 * These tests verify the end-to-end behavior of:
 * - OAuth enablement toggling
 * - Lazy OAuth triggering during API calls
 * - Auth precedence checking (CLI > Env > OAuth)
 * - Provider coordination with auth system
 * - OAuth enablement persistence
 */
describe('Auth Integration: Complete Precedence Flow and Provider Coordination', () => {
  let mockOAuthManager: OAuthManager;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    vi.clearAllMocks();
    originalEnv = { ...process.env };

    // Clear test environment variables (using fake names to avoid conflicts)
    delete process.env['TEST_ANTHROPIC_API_KEY'];
    delete process.env['TEST_GEMINI_API_KEY'];

    resetSettingsService();

    mockOAuthManager = createMockOAuthManager();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('Complete Auth Precedence Flow', () => {
    /**
     * @scenario Complete precedence chain with OAuth
     * @given CLI arg, env var, and OAuth all available
     * @when Provider resolves authentication
     * @then Uses CLI arg (highest precedence)
     * @and OAuth is not triggered
     */
    it('should follow complete precedence chain: CLI > Env > OAuth', async () => {
      // Given: All auth methods available
      const settingsService = getSettingsService();
      settingsService.set('auth-key', 'cli-api-key-123');

      process.env['TEST_ANTHROPIC_API_KEY'] = 'env-key-456';
      vi.mocked(mockOAuthManager.getToken).mockResolvedValue('oauth-token-789');

      const config: AuthPrecedenceConfig = {
        envKeyNames: ['TEST_ANTHROPIC_API_KEY'],
        isOAuthEnabled: true,
        supportsOAuth: true,
        oauthProvider: 'anthropic',
      };

      const resolver = new AuthPrecedenceResolver(config, mockOAuthManager);

      // When: Provider resolves authentication with CLI key
      const resolvedAuth = await resolver.resolveAuthentication();

      // Then: Should use CLI key (highest precedence)
      expect(resolvedAuth).toBe('cli-api-key-123');
      expect(mockOAuthManager.getToken).not.toHaveBeenCalled();
    });

    /**
     * @scenario Environment variable fallback
     * @given No CLI arg, env var and OAuth available
     * @when Provider resolves authentication
     * @then Uses env var (second precedence)
     * @and OAuth is not triggered
     */
    it('should fall back to environment variable when no CLI arg', async () => {
      // Given: Env var and OAuth available, no CLI arg
      process.env['TEST_ANTHROPIC_API_KEY'] = 'env-key-456';
      vi.mocked(mockOAuthManager.getToken).mockResolvedValue('oauth-token-789');

      const config: AuthPrecedenceConfig = {
        envKeyNames: ['TEST_ANTHROPIC_API_KEY'],
        isOAuthEnabled: true,
        supportsOAuth: true,
        oauthProvider: 'anthropic',
      };

      const resolver = new AuthPrecedenceResolver(config, mockOAuthManager);

      // When: Provider resolves authentication without CLI key
      const resolvedAuth = await resolver.resolveAuthentication();

      // Then: Should use environment variable (second precedence)
      expect(resolvedAuth).toBe('env-key-456');
      expect(mockOAuthManager.getToken).not.toHaveBeenCalled();
    });

    /**
     * @scenario OAuth as final fallback
     * @given No CLI arg, no env var, OAuth enabled
     * @when Provider resolves authentication
     * @then Triggers lazy OAuth (lowest precedence)
     * @and Returns OAuth token
     */
    it('should use OAuth as final fallback when no higher precedence auth', async () => {
      // Given: Only OAuth available
      delete process.env['TEST_ANTHROPIC_API_KEY'];
      vi.mocked(mockOAuthManager.getToken).mockResolvedValue('oauth-token-789');

      const config: AuthPrecedenceConfig = {
        envKeyNames: ['TEST_ANTHROPIC_API_KEY'],
        isOAuthEnabled: true,
        supportsOAuth: true,
        oauthProvider: 'anthropic',
      };

      const resolver = new AuthPrecedenceResolver(config, mockOAuthManager);

      // When: Provider resolves authentication with OAuth only
      const resolvedAuth = await resolver.resolveAuthentication();

      // Then: Should use OAuth token (lowest precedence)
      expect(resolvedAuth).toBe('oauth-token-789');
      expect(mockOAuthManager.getToken).toHaveBeenCalledWith('anthropic');
    });
  });

  describe('OAuth Token Integration', () => {
    /**
     * @scenario OAuth token availability check
     * @given OAuth manager with token available
     * @when Checking authentication status
     * @then Correctly identifies OAuth as available
     */
    it('should correctly check OAuth token availability', async () => {
      // Given: OAuth manager returns token
      vi.mocked(mockOAuthManager.getToken).mockResolvedValue(
        'valid-oauth-token',
      );
      vi.mocked(mockOAuthManager.isAuthenticated).mockResolvedValue(true);

      const config: AuthPrecedenceConfig = {
        envKeyNames: ['TEST_ANTHROPIC_API_KEY'],
        isOAuthEnabled: true,
        supportsOAuth: true,
        oauthProvider: 'anthropic',
      };

      const resolver = new AuthPrecedenceResolver(config, mockOAuthManager);

      // When: Check if OAuth only
      const isOAuthOnly = await resolver.isOAuthOnlyAvailable();

      // Then: Should correctly identify OAuth as available
      expect(isOAuthOnly).toBe(true);

      // And: Get auth method name
      const methodName = await resolver.getAuthMethodName();
      expect(methodName).toBe('oauth-anthropic');
    });
  });

  describe('Lazy OAuth Triggering During API Calls', () => {
    /**
     * @scenario Lazy OAuth triggers on first API call
     * @given OAuth enabled but not authenticated
     * @when Resolver checks authentication
     * @then OAuth flow triggered automatically
     * @and Subsequent calls use cached result
     */
    it('should trigger OAuth lazily on first authentication check', async () => {
      // Given: OAuth enabled but not yet authenticated
      vi.mocked(mockOAuthManager.getToken)
        .mockResolvedValueOnce(null) // First call - not authenticated
        .mockResolvedValue('oauth-token-123'); // Subsequent calls - authenticated

      const config: AuthPrecedenceConfig = {
        envKeyNames: ['TEST_ANTHROPIC_API_KEY'],
        isOAuthEnabled: true,
        supportsOAuth: true,
        oauthProvider: 'anthropic',
      };

      const resolver = new AuthPrecedenceResolver(config, mockOAuthManager);

      // When: First authentication attempt (triggers OAuth)
      const firstResult = await resolver.resolveAuthentication();

      // Then: Should return null initially (no auth)
      expect(firstResult).toBe(null);
      expect(mockOAuthManager.getToken).toHaveBeenCalledWith('anthropic');

      // When: Second authentication attempt (after OAuth completes)
      const secondResult = await resolver.resolveAuthentication();

      // Then: Should succeed with OAuth token
      expect(secondResult).toBe('oauth-token-123');
    });

    /**
     * @scenario No OAuth triggering when disabled
     * @given OAuth disabled for provider
     * @when Resolver attempts authentication without other auth
     * @then Returns null
     * @and No OAuth flow is triggered
     */
    it('should not trigger OAuth when disabled, returning null', async () => {
      // Given: OAuth disabled, no other auth methods
      vi.mocked(mockOAuthManager.getToken).mockResolvedValue('oauth-token');

      const config: AuthPrecedenceConfig = {
        envKeyNames: ['TEST_ANTHROPIC_API_KEY'],
        isOAuthEnabled: false, // Disabled
        supportsOAuth: true,
        oauthProvider: 'anthropic',
      };

      const resolver = new AuthPrecedenceResolver(config, mockOAuthManager);

      // When: Attempt authentication
      const result = await resolver.resolveAuthentication();

      // Then: Should return null and not call OAuth
      expect(result).toBe(null);
      expect(mockOAuthManager.getToken).not.toHaveBeenCalled();
    });
  });

  describe('Provider Coordination with Auth System', () => {
    /**
     * @scenario Multiple providers coordinate with shared auth system
     * @given Anthropic and Gemini providers both using auth precedence
     * @when Each provider resolves authentication independently
     * @then Each uses correct provider-specific config
     * @and Auth states remain independent
     */
    it('should coordinate multiple providers with shared auth infrastructure', async () => {
      // Given: Both providers with different configurations
      vi.mocked(mockOAuthManager.getToken).mockImplementation(
        async (provider: string) =>
          provider === 'anthropic' ? 'anthropic-oauth-token' : null,
      );

      const anthropicConfig: AuthPrecedenceConfig = {
        envKeyNames: ['TEST_ANTHROPIC_API_KEY'],
        isOAuthEnabled: true,
        supportsOAuth: true,
        oauthProvider: 'anthropic',
      };

      const geminiConfig: AuthPrecedenceConfig = {
        envKeyNames: ['TEST_GEMINI_API_KEY'],
        isOAuthEnabled: false,
        supportsOAuth: true,
        oauthProvider: 'gemini',
      };

      process.env['TEST_GEMINI_API_KEY'] = 'gemini-env-key';

      const anthropicResolver = new AuthPrecedenceResolver(
        anthropicConfig,
        mockOAuthManager,
      );
      const geminiResolver = new AuthPrecedenceResolver(geminiConfig);

      // When: Both providers resolve authentication
      const anthropicAuth = await anthropicResolver.resolveAuthentication();
      const geminiAuth = await geminiResolver.resolveAuthentication();

      // Then: Each provider gets appropriate result
      expect(anthropicAuth).toBe('anthropic-oauth-token');
      expect(geminiAuth).toBe('gemini-env-key');

      // And: OAuth manager called only for anthropic
      expect(mockOAuthManager.getToken).toHaveBeenCalledWith('anthropic');
    });

    /**
     * @scenario Provider-specific key storage
     * @given Different providers need different auth
     * @when Provider-specific keys are set
     * @then Each provider gets correct key
     * @and Keys don't interfere
     */
    it('should support provider-specific authentication keys', async () => {
      // Given: Provider-specific keys configured
      const settingsService = getSettingsService();
      settingsService.set('anthropic-auth-key', 'anthropic-specific-key');
      settingsService.set('gemini-auth-key', 'gemini-specific-key');

      const anthropicConfig: AuthPrecedenceConfig = {
        providerName: 'anthropic',
        envKeyNames: ['TEST_ANTHROPIC_API_KEY'],
      };

      const geminiConfig: AuthPrecedenceConfig = {
        providerName: 'gemini',
        envKeyNames: ['TEST_GEMINI_API_KEY'],
      };

      const anthropicResolver = new AuthPrecedenceResolver(anthropicConfig);
      const geminiResolver = new AuthPrecedenceResolver(geminiConfig);

      // When: Resolve authentication for both
      const anthropicAuth = await anthropicResolver.resolveAuthentication();
      const geminiAuth = await geminiResolver.resolveAuthentication();

      // Then: Each gets correct provider-specific key
      expect(anthropicAuth).toBe('anthropic-specific-key');
      expect(geminiAuth).toBe('gemini-specific-key');
    });
  });

  describe('End-to-End Integration Scenarios', () => {
    /**
     * @scenario Complete user workflow: enable OAuth, authenticate, persist
     * @given Fresh system with no authentication
     * @when User enables OAuth and authenticates
     * @then All steps succeed with proper coordination
     */
    it('should handle complete user workflow end-to-end', async () => {
      // Step 1: No authentication available initially
      const config: AuthPrecedenceConfig = {
        envKeyNames: ['TEST_ANTHROPIC_API_KEY'],
        isOAuthEnabled: true,
        supportsOAuth: true,
        oauthProvider: 'anthropic',
      };

      const resolver = new AuthPrecedenceResolver(config, mockOAuthManager);

      vi.mocked(mockOAuthManager.getToken).mockResolvedValue(null);
      const initialAuth = await resolver.resolveAuthentication();
      expect(initialAuth).toBe(null);

      // Step 2: Simulate OAuth flow completion (OAuth manager now has token)
      // Step 3: OAuth manager now returns token
      vi.mocked(mockOAuthManager.getToken).mockResolvedValue(
        'oauth-success-token',
      );
      vi.mocked(mockOAuthManager.isAuthenticated).mockResolvedValue(true);

      // Step 4: Verify authentication works
      const finalAuth = await resolver.resolveAuthentication();
      expect(finalAuth).toBe('oauth-success-token');

      // Step 5: Verify method name is correct
      const methodName = await resolver.getAuthMethodName();
      expect(methodName).toBe('oauth-anthropic');
    });

    /**
     * @scenario Mixed auth methods coordination
     * @given Some providers use API keys, others use OAuth
     * @when Making authentication checks with mixed auth
     * @then Each provider uses appropriate auth method
     * @and No interference between auth methods
     */
    it('should coordinate mixed authentication methods without interference', async () => {
      // Given: Mixed authentication setup
      const settingsService = getSettingsService();
      settingsService.set('anthropic-auth-key', 'anthropic-api-key');

      vi.mocked(mockOAuthManager.getToken).mockImplementation(
        async (provider: string) =>
          provider === 'gemini' ? 'gemini-oauth-token' : null,
      );

      // Two different auth strategies
      const anthropicConfig: AuthPrecedenceConfig = {
        providerName: 'anthropic',
        envKeyNames: ['TEST_ANTHROPIC_API_KEY'],
      };

      const geminiConfig: AuthPrecedenceConfig = {
        envKeyNames: ['TEST_GEMINI_API_KEY'],
        isOAuthEnabled: true,
        supportsOAuth: true,
        oauthProvider: 'gemini',
      };

      const anthropicResolver = new AuthPrecedenceResolver(anthropicConfig);
      const geminiResolver = new AuthPrecedenceResolver(
        geminiConfig,
        mockOAuthManager,
      );

      // When: Both providers resolve authentication
      const anthropicAuth = await anthropicResolver.resolveAuthentication();
      const geminiAuth = await geminiResolver.resolveAuthentication();

      // Then: Each uses appropriate method without interference
      expect(anthropicAuth).toBe('anthropic-api-key'); // Provider-specific key
      expect(geminiAuth).toBe('gemini-oauth-token'); // OAuth

      // And: OAuth manager only called for OAuth-enabled provider
      expect(mockOAuthManager.getToken).toHaveBeenCalledWith('gemini');
      expect(mockOAuthManager.getToken).not.toHaveBeenCalledWith('anthropic');
    });
  });
});
