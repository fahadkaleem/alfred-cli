/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

export interface IModel {
  id: string;
  name: string;
  provider: string;
  supportedToolFormats: string[];
  contextWindow?: number;
  maxOutputTokens?: number;
}
