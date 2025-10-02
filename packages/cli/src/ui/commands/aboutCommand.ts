/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { getCliVersion } from '../../utils/version.js';
import type { SlashCommand } from './types.js';
import { CommandKind } from './types.js';
import process from 'node:process';
import { MessageType, type HistoryItemAbout } from '../types.js';

export const aboutCommand: SlashCommand = {
  name: 'about',
  description: 'show version info',
  kind: CommandKind.BUILT_IN,
  action: async (context) => {
    const osVersion = process.platform;
    const modelVersion = context.services.config?.getModel() || 'Unknown';
    const cliVersion = await getCliVersion();
    const selectedAuthType =
      context.services.settings.merged.security?.auth?.selectedType || '';
    const gcpProject = process.env['GOOGLE_CLOUD_PROJECT'] || '';

    const aboutItem: Omit<HistoryItemAbout, 'id'> = {
      type: MessageType.ABOUT,
      cliVersion,
      osVersion,
      modelVersion,
      selectedAuthType,
      gcpProject,
      ideClient: '', // IDE integration removed
    };

    context.ui.addItem(aboutItem, Date.now());
  },
};
