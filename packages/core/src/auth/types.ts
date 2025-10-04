/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { z } from 'zod';

/**
 * OAuth token storage schema
 */
export const OAuthTokenSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string().optional(),
  expiry: z.number(), // Unix timestamp
  scope: z.string().nullable().optional(),
  token_type: z.literal('Bearer'),
  resource_url: z.string().optional(),
});

/**
 * Provider OAuth configuration schema
 */
export const ProviderOAuthConfigSchema = z.object({
  provider: z.enum(['gemini', 'anthropic']),
  clientId: z.string(),
  authorizationEndpoint: z.string().url(),
  tokenEndpoint: z.string().url(),
  scopes: z.array(z.string()),
});

/**
 * Device code response schema
 */
export const DeviceCodeResponseSchema = z.object({
  device_code: z.string(),
  user_code: z.string(),
  verification_uri: z.string().url(),
  verification_uri_complete: z.string().url().optional(),
  expires_in: z.number(),
  interval: z.number().optional(),
});

/**
 * Token response schema
 */
export const TokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
  expires_in: z.number().optional(),
  refresh_token: z.string().optional(),
  scope: z.string().nullable().optional(),
  resource_url: z.string().optional(),
});

/**
 * Auth status schema
 */
export const AuthStatusSchema = z.object({
  provider: z.string(),
  authenticated: z.boolean(),
  authType: z.enum(['oauth', 'api-key', 'none']),
  expiresIn: z.number().optional(), // seconds until expiry
  oauthEnabled: z.boolean().optional(), // whether OAuth is enabled for this provider
});

// Export TypeScript types inferred from schemas
export type OAuthToken = z.infer<typeof OAuthTokenSchema>;
export type ProviderOAuthConfig = z.infer<typeof ProviderOAuthConfigSchema>;
export type DeviceCodeResponse = z.infer<typeof DeviceCodeResponseSchema>;
export type TokenResponse = z.infer<typeof TokenResponseSchema>;
export type AuthStatus = z.infer<typeof AuthStatusSchema>;
