/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ITokenizer {
  countTokens(text: string, model: string): Promise<number>;
}
