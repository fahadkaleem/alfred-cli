/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import { Box, Text } from 'ink';
import Gradient from 'ink-gradient';
import BigText from 'ink-big-text';
import { useTheme } from '../contexts/ThemeContext.js';
import { shortenPath, tildeifyPath } from '@alfred/alfred-cli-core';
import { useTerminalSize } from '../hooks/useTerminalSize.js';

interface HeaderProps {
  version: string;
  model: string;
  targetDir: string;
  nightly: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  version,
  model,
  targetDir,
}) => {
  const { semanticColors } = useTheme();
  const { columns: terminalWidth } = useTerminalSize();
  const pathLength = Math.max(20, Math.floor(terminalWidth * 0.25));
  const displayPath = shortenPath(tildeifyPath(targetDir), pathLength);

  return (
    <Box flexDirection="row" gap={2} alignItems="center">
      {/* Left: Alfred BigText */}
      <Box>
        {semanticColors.ui.gradient ? (
          <Gradient colors={semanticColors.ui.gradient}>
            <BigText text="Alfred" font="tiny" />
          </Gradient>
        ) : (
          <BigText text="Alfred" font="tiny" />
        )}
      </Box>

      {/* Right: Version, Model, CWD */}
      <Box flexDirection="column" justifyContent="flex-start">
        {semanticColors.ui.gradient ? (
          <Gradient colors={semanticColors.ui.gradient}>
            <Text>
              v{version} · {model}
            </Text>
          </Gradient>
        ) : (
          <Text color={semanticColors.text.link}>
            v{version} · {model}
          </Text>
        )}
        {semanticColors.ui.gradient ? (
          <Gradient colors={semanticColors.ui.gradient}>
            <Text>{displayPath}</Text>
          </Gradient>
        ) : (
          <Text color={semanticColors.text.link}>{displayPath}</Text>
        )}
      </Box>
    </Box>
  );
};
