/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Centralized SettingsService singleton instance
 */

import { SettingsService } from './SettingsService.js';

// Re-export SettingsService type for convenience
export type { SettingsService };

let settingsServiceInstance: SettingsService | null = null;

/**
 * Get or create the global SettingsService singleton instance
 */
export function getSettingsService(): SettingsService {
  if (!settingsServiceInstance) {
    settingsServiceInstance = new SettingsService();
  }

  return settingsServiceInstance;
}

/**
 * Reset the settings service instance (for testing)
 */
export function resetSettingsService(): void {
  if (settingsServiceInstance) {
    settingsServiceInstance.clear();
  }
  settingsServiceInstance = null;
}
