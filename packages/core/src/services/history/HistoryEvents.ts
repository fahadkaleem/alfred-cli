/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Event data emitted when token count is updated
 */
export interface TokensUpdatedEvent {
  /** The new total token count */
  totalTokens: number;

  /** Number of tokens added (positive) or removed (negative) */
  addedTokens: number;

  /** ID of the content that triggered the update, if applicable */
  contentId?: string | null;
}

/**
 * All possible history service events
 */
export interface HistoryServiceEvents {
  tokensUpdated: (event: TokensUpdatedEvent) => void;
}
