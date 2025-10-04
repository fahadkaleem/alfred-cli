/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Anthropic OAuth 2.0 Device Flow Implementation
 *
 * Implements OAuth 2.0 device authorization grant flow for Anthropic Claude API.
 * Based on the OAuth 2.0 Device Authorization Grant specification (RFC 8628).
 */

import type { DeviceCodeResponse, OAuthToken } from './types.js';
import { createHash, randomBytes } from 'node:crypto';

const ANTHROPIC_CLIENT_ID = '9d1c250a-e61b-44d9-88ed-5944d1962f5e';
const ANTHROPIC_AUTH_URL = 'https://claude.ai/oauth/authorize';
const ANTHROPIC_TOKEN_URL = 'https://console.anthropic.com/v1/oauth/token';
const ANTHROPIC_REDIRECT_URI =
  'https://console.anthropic.com/oauth/code/callback';
const ANTHROPIC_VERIFY_URI = 'https://console.anthropic.com/oauth/authorize';
const DEFAULT_SCOPES = ['org:create_api_key', 'user:profile', 'user:inference'];
const AUTH_TIMEOUT = 30 * 60; // 30 minutes in seconds
const POLLING_INTERVAL = 5; // 5 seconds
const DEFAULT_TOKEN_EXPIRY = 3600; // 1 hour in seconds

/**
 * Configuration for Anthropic device flow authentication
 */
interface AnthropicFlowConfig {
  clientId: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  scopes: string[];
}

/**
 * Anthropic-specific OAuth 2.0 device flow implementation.
 * Handles authentication for Claude API access.
 */
export class AnthropicDeviceFlow {
  private config: AnthropicFlowConfig;
  private codeVerifier?: string;
  private state?: string;

  constructor(config?: Partial<AnthropicFlowConfig>) {
    const defaultConfig: AnthropicFlowConfig = {
      clientId: ANTHROPIC_CLIENT_ID,
      authorizationEndpoint: ANTHROPIC_AUTH_URL,
      tokenEndpoint: ANTHROPIC_TOKEN_URL,
      scopes: DEFAULT_SCOPES,
    };

    this.config = { ...defaultConfig, ...config };
  }

  /**
   * Generates PKCE code verifier and challenge using S256 method
   */
  private generatePKCE(): { verifier: string; challenge: string } {
    const verifier = randomBytes(32).toString('base64url');
    this.codeVerifier = verifier;

    const challenge = createHash('sha256').update(verifier).digest('base64url');

    return { verifier, challenge };
  }

  /**
   * Initiates the OAuth flow by constructing the authorization URL.
   * Since Anthropic doesn't have a device flow, we simulate it with authorization code flow.
   */
  async initiateDeviceFlow(): Promise<DeviceCodeResponse> {
    const { verifier, challenge } = this.generatePKCE();
    this.state = verifier;

    const params = new URLSearchParams({
      code: 'true',
      client_id: this.config.clientId,
      response_type: 'code',
      redirect_uri: ANTHROPIC_REDIRECT_URI,
      scope: this.config.scopes.join(' '),
      code_challenge: challenge,
      code_challenge_method: 'S256',
      state: verifier,
    });

    const authUrl = `${this.config.authorizationEndpoint}?${params.toString()}`;

    return {
      device_code: verifier,
      user_code: 'ANTHROPIC',
      verification_uri: ANTHROPIC_VERIFY_URI,
      verification_uri_complete: authUrl,
      expires_in: AUTH_TIMEOUT,
      interval: POLLING_INTERVAL,
    };
  }

  /**
   * Exchange authorization code for access token (PKCE flow)
   */
  async exchangeCodeForToken(authCodeWithState: string): Promise<OAuthToken> {
    if (!this.codeVerifier) {
      throw new Error(
        'No PKCE code verifier found - OAuth flow not initialized',
      );
    }

    const splits = authCodeWithState.split('#');
    const authCode = splits[0];
    const stateFromResponse = splits[1] || this.state;

    console.log('Exchanging authorization code:', {
      codeLength: authCode.length,
      codePreview: authCode.substring(0, 10) + '...',
      hasVerifier: !!this.codeVerifier,
      verifierLength: this.codeVerifier.length,
      hasState: !!stateFromResponse,
    });

    const requestBody = {
      grant_type: 'authorization_code',
      code: authCode,
      state: stateFromResponse,
      client_id: this.config.clientId,
      redirect_uri: ANTHROPIC_REDIRECT_URI,
      code_verifier: this.codeVerifier,
    };

    console.log('Token request body:', JSON.stringify(requestBody));

    const response = await fetch(this.config.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to exchange authorization code: ${error}`);
    }

    const data = await response.json();
    console.log('Token response:', {
      hasAccessToken: !!data['access_token'],
      hasRefreshToken: !!data['refresh_token'],
      tokenPreview: data['access_token']
        ? data['access_token'].substring(0, 20) + '...'
        : 'none',
      expiresIn: data['expires_in'],
      scope: data['scope'],
    });
    return this.mapTokenResponse(data);
  }

  /**
   * Polls for the access token after user authorization.
   */
  async pollForToken(deviceCode: string): Promise<OAuthToken> {
    const startTime = Date.now();
    const expiresIn = AUTH_TIMEOUT * 1000;
    const interval = POLLING_INTERVAL * 1000;

    while (Date.now() - startTime < expiresIn) {
      try {
        const response = await fetch(this.config.tokenEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
            device_code: deviceCode,
            client_id: this.config.clientId,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          return this.mapTokenResponse(data);
        }

        const error = await response.json();

        // Check for pending authorization
        if (error.error === 'authorization_pending') {
          await new Promise((resolve) => setTimeout(resolve, interval));
          continue;
        }

        // Check for slow down request
        if (error.error === 'slow_down') {
          await new Promise((resolve) => setTimeout(resolve, interval * 2));
          continue;
        }

        // Handle other errors
        throw new Error(
          `Token polling failed: ${error.error_description || error.error}`,
        );
      } catch (error) {
        if (
          error instanceof Error &&
          error['message'].includes('Token polling failed')
        ) {
          throw error;
        }
        // Network errors - continue polling
        await new Promise((resolve) => setTimeout(resolve, interval));
      }
    }

    throw new Error(
      'Authorization timeout - user did not complete authentication',
    );
  }

  /**
   * Refreshes an expired access token using a refresh token.
   */
  async refreshToken(refreshToken: string): Promise<OAuthToken> {
    const response = await fetch(this.config.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: this.config.clientId,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to refresh Anthropic token: ${error}`);
    }

    const data = await response.json();
    return this.mapTokenResponse(data);
  }

  /**
   * Maps Anthropic's token response to our standard OAuthToken format.
   */
  private mapTokenResponse(data: Record<string, unknown>): OAuthToken {
    return {
      access_token: data['access_token'] as string,
      expiry:
        Math.floor(Date.now() / 1000) +
        ((data['expires_in'] as number) || DEFAULT_TOKEN_EXPIRY),
      refresh_token: data['refresh_token'] as string | undefined,
      scope: data['scope'] as string | undefined,
      token_type: 'Bearer',
    };
  }
}
