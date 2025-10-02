/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import { Box, Text } from 'ink';
import { theme } from '../semantic-colors.js';
import { type Config } from '@alfred/alfred-cli-core';

interface TipsProps {
  config: Config;
}

export const Tips: React.FC<TipsProps> = ({ config }) => {
  const alfredMdFileCount = config.getAlfredMdFileCount();
  return (
    <Box flexDirection="column">
      <Text color={theme.text.primary}>
        Welcome to Alfred, your AI project planning buddy...
      </Text>
      <Text color={theme.text.primary}>
        1. Break down projects into tasks with natural language.
      </Text>
      <Text color={theme.text.primary}>
        2. Get help with file analysis, code reviews, and planning. This is a
        work in progress.
      </Text>
      <Text color={theme.text.primary}>
        3. Track progress and manage your development workflow.
      </Text>
      {alfredMdFileCount === 0 && (
        <Text color={theme.text.primary}>
          3. Create{' '}
          <Text bold color={theme.text.accent}>
            ALFRED.md
          </Text>{' '}
          files to customize your interactions with Alfred.
        </Text>
      )}
      <Text color={theme.text.primary}>
        {alfredMdFileCount === 0 ? '4.' : '3.'}{' '}
        <Text bold color={theme.text.accent}>
          /help
        </Text>{' '}
        for more information.
      </Text>
    </Box>
  );
};
