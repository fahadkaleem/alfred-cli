/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import { Text, Box } from 'ink';
import { theme } from '../../semantic-colors.js';

interface ThinkingMessageProps {
  text: string;
  terminalWidth: number;
}

export const ThinkingMessage: React.FC<ThinkingMessageProps> = ({
  text,
  terminalWidth,
}) => {
  const innerWidth = terminalWidth - 4; // Account for border and margins

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={theme.text.secondary}
      marginLeft={1}
      marginBottom={1}
      width="100%"
    >
      <Box flexDirection="row" paddingX={1}>
        <Text color={theme.text.secondary} dimColor>
          💭 Thinking
        </Text>
      </Box>
      <Box flexDirection="row" paddingX={1} paddingBottom={1}>
        <Text color={theme.text.secondary} dimColor wrap="wrap">
          {text.length > innerWidth
            ? text.substring(0, innerWidth - 3) + '...'
            : text}
        </Text>
      </Box>
    </Box>
  );
};
