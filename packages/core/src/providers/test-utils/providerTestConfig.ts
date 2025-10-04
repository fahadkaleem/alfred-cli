/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { IProviderConfig } from '../types/IProviderConfig.js';

/**
 * Test provider configuration used across provider tests.
 * Provides a consistent base configuration for testing purposes.
 */
export const TEST_PROVIDER_CONFIG: IProviderConfig = {
  allowBrowserEnvironment: true,
  streaming: true,
  timeout: 30000,
  maxTokens: 4096,
  temperature: 0.7,
};
