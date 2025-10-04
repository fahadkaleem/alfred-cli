/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @plan PLAN-20250120-DEBUGLOGGING.P05
 * @requirement REQ-001
 * Mock implementation for DebugLogger testing
 */

export interface LogEntry {
  timestamp: string;
  namespace: string;
  level: string;
  message: string;
  args?: unknown[];
}

export class MockFileOutput {
  private static instance: MockFileOutput;
  private entries: LogEntry[] = [];

  static getInstance(): MockFileOutput {
    if (!MockFileOutput.instance) {
      MockFileOutput.instance = new MockFileOutput();
    }
    return MockFileOutput.instance;
  }

  write(entry: LogEntry): void {
    this.entries.push(entry);
  }

  getEntries(): LogEntry[] {
    return [...this.entries];
  }

  clear(): void {
    this.entries = [];
  }
}
