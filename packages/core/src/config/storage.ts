/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as path from 'node:path';
import * as os from 'node:os';
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';

export const ALFRED_DIR = '.alfred';
export const GOOGLE_ACCOUNTS_FILENAME = 'google_accounts.json';
export const OAUTH_FILE = 'oauth_creds.json';
const TMP_DIR_NAME = 'tmp';
const BIN_DIR_NAME = 'bin';

export class Storage {
  private readonly targetDir: string;

  constructor(targetDir: string) {
    this.targetDir = targetDir;
  }

  static getGlobalAlfredDir(): string {
    const homeDir = os.homedir();
    if (!homeDir) {
      return path.join(os.tmpdir(), '.alfred');
    }
    return path.join(homeDir, ALFRED_DIR);
  }

  static getMcpOAuthTokensPath(): string {
    return path.join(Storage.getGlobalAlfredDir(), 'mcp-oauth-tokens.json');
  }

  static getGlobalSettingsPath(): string {
    return path.join(Storage.getGlobalAlfredDir(), 'settings.json');
  }

  static getInstallationIdPath(): string {
    return path.join(Storage.getGlobalAlfredDir(), 'installation_id');
  }

  static getGoogleAccountsPath(): string {
    return path.join(Storage.getGlobalAlfredDir(), GOOGLE_ACCOUNTS_FILENAME);
  }

  static getUserCommandsDir(): string {
    return path.join(Storage.getGlobalAlfredDir(), 'commands');
  }

  static getGlobalMemoryFilePath(): string {
    return path.join(Storage.getGlobalAlfredDir(), 'memory.md');
  }

  static getGlobalTempDir(): string {
    return path.join(Storage.getGlobalAlfredDir(), TMP_DIR_NAME);
  }

  static getGlobalBinDir(): string {
    return path.join(Storage.getGlobalTempDir(), BIN_DIR_NAME);
  }

  getAlfredDir(): string {
    return path.join(this.targetDir, ALFRED_DIR);
  }

  getProjectTempDir(): string {
    const hash = this.getFilePathHash(this.getProjectRoot());
    const tempDir = Storage.getGlobalTempDir();
    return path.join(tempDir, hash);
  }

  ensureProjectTempDirExists(): void {
    fs.mkdirSync(this.getProjectTempDir(), { recursive: true });
  }

  static getOAuthCredsPath(): string {
    return path.join(Storage.getGlobalAlfredDir(), OAUTH_FILE);
  }

  getProjectRoot(): string {
    return this.targetDir;
  }

  private getFilePathHash(filePath: string): string {
    return crypto.createHash('sha256').update(filePath).digest('hex');
  }

  getHistoryDir(): string {
    const hash = this.getFilePathHash(this.getProjectRoot());
    const historyDir = path.join(Storage.getGlobalAlfredDir(), 'history');
    return path.join(historyDir, hash);
  }

  getWorkspaceSettingsPath(): string {
    return path.join(this.getAlfredDir(), 'settings.json');
  }

  getProjectCommandsDir(): string {
    return path.join(this.getAlfredDir(), 'commands');
  }

  getProjectTempCheckpointsDir(): string {
    return path.join(this.getProjectTempDir(), 'checkpoints');
  }

  getExtensionsDir(): string {
    return path.join(this.getAlfredDir(), 'extensions');
  }

  getExtensionsConfigPath(): string {
    return path.join(this.getExtensionsDir(), 'gemini-extension.json');
  }

  getHistoryFilePath(): string {
    return path.join(this.getProjectTempDir(), 'shell_history');
  }
}
