/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ITool {
  type: 'function';
  function: {
    name: string;
    description?: string;
    parameters: object;
  };
}
