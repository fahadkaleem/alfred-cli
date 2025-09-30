/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import { Box, Text } from 'ink';
import BigText from 'ink-big-text';
import Gradient from 'ink-gradient';
import { TitledBox, titleStyles } from '@mishieck/ink-titled-box';
import { theme } from '../semantic-colors.js';
import { useTerminalSize } from '../hooks/useTerminalSize.js';
import { type Config } from '@alfred/alfred-cli-core';

interface WelcomeMessageProps {
  version: string;
  config: Config;
}

export const WelcomeMessage: React.FC<WelcomeMessageProps> = ({
  version,
  config,
}) => {
  const { columns } = useTerminalSize();
  const alfredMdFileCount = config.getAlfredMdFileCount();

  // Use gradient colors from theme if available
  const gradientColors = theme.ui.gradient || ['#ff0080', '#7928ca'];

  return (
    <>
      <Gradient colors={gradientColors}>
        <BigText text="Alfred" font="tiny" />
      </Gradient>

      <TitledBox
        borderStyle="round"
        titles={[
          `✻ Welcome to Alfred, your AI project planning buddy ${version}`,
        ]}
        titleStyles={titleStyles['pill']}
        width={columns > 80 ? columns - 10 : columns - 2}
        borderColor={theme.border.default}
        paddingX={2}
        paddingY={1}
        flexDirection="column"
        marginBottom={1}
      >
        <Box paddingBottom={1}>
          <Text color={theme.text.primary}>
            1. Break down projects into tasks with natural language.
          </Text>
        </Box>
        <Box paddingBottom={1}>
          <Text color={theme.text.primary}>
            2. Get help with file analysis, code reviews, and planning.
          </Text>
        </Box>
        <Box paddingBottom={1}>
          <Text color={theme.text.primary}>
            3. Track progress and manage your development workflow.
          </Text>
        </Box>
        <Box paddingBottom={1}>
          <Text color={theme.text.primary}>
            4. Type /exit or press Ctrl+C to quit.
          </Text>
        </Box>
        {alfredMdFileCount === 0 && (
          <Box paddingBottom={1}>
            <Text color={theme.text.primary}>
              Create{' '}
              <Text bold color={theme.text.accent}>
                ALFRED.md
              </Text>{' '}
              files to customize your interactions with Gemini.
            </Text>
          </Box>
        )}
        <Text color={theme.text.accent} bold>
          /help for more information
        </Text>
      </TitledBox>
    </>
  );
};
