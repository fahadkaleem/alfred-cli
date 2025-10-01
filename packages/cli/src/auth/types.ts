/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

// Re-export core auth types for CLI usage
// Note: We import from the main package export. The OAuthToken type from auth/types.ts
// uses snake_case properties (access_token, token_type, expiry) which matches OAuth2 specs.
// This is different from the MCP OAuthToken which uses camelCase.
export type {
  OAuthToken,
  AuthStatus,
  TokenStore,
} from '@alfred/alfred-cli-core';

export { MultiProviderTokenStore } from '@alfred/alfred-cli-core';
