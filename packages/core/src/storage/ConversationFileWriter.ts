/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

export class ConversationFileWriter {
  private logPath: string;
  private currentLogFile: string;

  constructor(logPath?: string) {
    this.logPath =
      logPath || path.join(os.homedir(), '.llxprt', 'conversations');
    this.currentLogFile = path.join(
      this.logPath,
      `conversation-${new Date().toISOString().split('T')[0]}.jsonl`,
    );
    this.ensureLogDirectory();
  }

  private ensureLogDirectory(): void {
    if (!fs.existsSync(this.logPath)) {
      fs.mkdirSync(this.logPath, { recursive: true });
    }
  }

  writeEntry(entry: Record<string, unknown>): void {
    try {
      const logEntry = {
        timestamp: new Date().toISOString(),
        ...entry,
      };
      const line = JSON.stringify(logEntry) + '\n';
      fs.appendFileSync(this.currentLogFile, line);
    } catch (error) {
      console.error('Failed to write log entry:', error);
    }
  }

  writeRequest(
    provider: string,
    messages: unknown[],
    context?: Record<string, unknown>,
  ): void {
    this.writeEntry({
      type: 'request',
      provider,
      messages,
      context,
    });
  }

  writeResponse(
    provider: string,
    response: unknown,
    metadata?: Record<string, unknown>,
  ): void {
    this.writeEntry({
      type: 'response',
      provider,
      response,
      metadata,
    });
  }

  writeToolCall(
    provider: string,
    toolName: string,
    context?: Record<string, unknown>,
  ): void {
    this.writeEntry({
      type: 'tool_call',
      provider,
      tool: toolName,
      ...context,
    });
  }
}

// Singleton instance
let fileWriter: ConversationFileWriter | null = null;

export function getConversationFileWriter(
  logPath?: string,
): ConversationFileWriter {
  if (!fileWriter) {
    fileWriter = new ConversationFileWriter(logPath);
  }
  return fileWriter;
}
