/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @plan PLAN-20250120-DEBUGLOGGING.P10
 * @requirement REQ-005
 */
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { ALFRED_DIR } from '../utils/paths.js';
import type { LogEntry } from './types.js';

interface QueuedEntry {
  entry: LogEntry;
  timestamp: number;
}

export class FileOutput {
  private static instance: FileOutput;
  private debugDir: string;
  private currentLogFile: string;
  private writeQueue: QueuedEntry[] = [];
  private isWriting = false;
  private disposed = false;
  private flushTimeout: NodeJS.Timeout | null = null;
  private maxFileSize = 10 * 1024 * 1024; // 10MB
  private maxQueueSize = 1000;
  private batchSize = 50;
  private flushInterval = 1000; // 1 second

  private constructor() {
    const home = homedir();
    // Handle test environments where homedir might not be available
    this.debugDir = home
      ? join(home, ALFRED_DIR, 'debug')
      : join(process.cwd(), ALFRED_DIR, 'debug');
    this.currentLogFile = this.generateLogFileName();
    this.startFlushTimer();
  }

  static getInstance(): FileOutput {
    if (!FileOutput.instance) {
      FileOutput.instance = new FileOutput();
    }
    return FileOutput.instance;
  }

  async write(entry: LogEntry): Promise<void> {
    if (this.disposed) {
      return;
    }

    // Add to queue
    this.writeQueue.push({
      entry,
      timestamp: Date.now(),
    });

    // Prevent queue from growing too large
    if (this.writeQueue.length > this.maxQueueSize) {
      this.writeQueue = this.writeQueue.slice(-this.maxQueueSize);
    }

    // Flush immediately if queue is large or not currently writing
    if (this.writeQueue.length >= this.batchSize || !this.isWriting) {
      await this.flushQueue();
    }
  }

  async dispose(): Promise<void> {
    this.disposed = true;

    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout);
      this.flushTimeout = null;
    }

    // Flush any remaining entries
    await this.flushQueue();
  }

  private startFlushTimer(): void {
    if (this.disposed) {
      return;
    }

    this.flushTimeout = setTimeout(async () => {
      await this.flushQueue();
      this.startFlushTimer();
    }, this.flushInterval);
  }

  private async flushQueue(): Promise<void> {
    if (this.isWriting || this.writeQueue.length === 0 || this.disposed) {
      return;
    }

    this.isWriting = true;
    let entriesToWrite: QueuedEntry[] = [];

    try {
      await this.ensureDirectoryExists();
      await this.checkFileRotation();

      // Process entries in batches
      entriesToWrite = this.writeQueue.splice(0, this.batchSize);

      if (entriesToWrite.length === 0) {
        return;
      }

      // Convert to JSONL format
      const jsonlData =
        entriesToWrite.map(({ entry }) => JSON.stringify(entry)).join('\n') +
        '\n';

      // Write to file with proper permissions
      await fs.appendFile(this.currentLogFile, jsonlData, {
        encoding: 'utf8',
        mode: 0o600,
      });
    } catch (error) {
      // Gracefully handle errors - don't crash the application
      console.error('FileOutput: Failed to write log entries:', error);

      // Put entries back in queue for retry (but limit retries)
      if (this.writeQueue.length < this.maxQueueSize / 2) {
        this.writeQueue.unshift(...entriesToWrite);
      }
    } finally {
      this.isWriting = false;
    }
  }

  private async ensureDirectoryExists(): Promise<void> {
    try {
      await fs.access(this.debugDir);
    } catch {
      await fs.mkdir(this.debugDir, {
        recursive: true,
        mode: 0o700,
      });
    }
  }

  private async checkFileRotation(): Promise<void> {
    try {
      const stats = await fs.stat(this.currentLogFile);

      // Rotate by size
      if (stats.size >= this.maxFileSize) {
        this.currentLogFile = this.generateLogFileName();
        return;
      }

      // Rotate by date (daily rotation)
      const fileDate = new Date(stats.birthtime);
      const today = new Date();
      if (fileDate.toDateString() !== today.toDateString()) {
        this.currentLogFile = this.generateLogFileName();
      }
    } catch {
      // File doesn't exist yet, that's fine
    }
  }

  private generateLogFileName(): string {
    const now = new Date();
    const dateString = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const timeString = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
    return join(
      this.debugDir,
      `llxprt-debug-${dateString}-${timeString}.jsonl`,
    );
  }
}
