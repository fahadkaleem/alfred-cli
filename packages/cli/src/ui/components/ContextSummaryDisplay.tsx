/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import { Box, Text } from 'ink';
import { theme } from '../semantic-colors.js';
import { type MCPServerConfig } from '@alfred/alfred-cli-core';
import { useTerminalSize } from '../hooks/useTerminalSize.js';
import { isNarrowWidth } from '../utils/isNarrowWidth.js';

interface ContextSummaryDisplayProps {
  alfredMdFileCount: number;
  contextFileNames: string[];
  mcpServers?: Record<string, MCPServerConfig>;
  blockedMcpServers?: Array<{ name: string; extensionName: string }>;
  showToolDescriptions?: boolean;
}

export const ContextSummaryDisplay: React.FC<ContextSummaryDisplayProps> = ({
  alfredMdFileCount,
  contextFileNames,
  mcpServers,
  blockedMcpServers,
  showToolDescriptions,
}) => {
  const { columns: terminalWidth } = useTerminalSize();
  const isNarrow = isNarrowWidth(terminalWidth);
  const mcpServerCount = Object.keys(mcpServers || {}).length;
  const blockedMcpServerCount = blockedMcpServers?.length || 0;
  const openFileCount = 0; // IDE integration removed

  if (
    alfredMdFileCount === 0 &&
    mcpServerCount === 0 &&
    blockedMcpServerCount === 0 &&
    openFileCount === 0
  ) {
    return <Text> </Text>; // Render an empty space to reserve height
  }

  const openFilesText = (() => {
    if (openFileCount === 0) {
      return '';
    }
    return `${openFileCount} open file${
      openFileCount > 1 ? 's' : ''
    } (ctrl+g to view)`;
  })();

  const geminiMdText = (() => {
    if (alfredMdFileCount === 0) {
      return '';
    }
    const allNamesTheSame = new Set(contextFileNames).size < 2;
    const name = allNamesTheSame ? contextFileNames[0] : 'context';
    return `${alfredMdFileCount} ${name} file${
      alfredMdFileCount > 1 ? 's' : ''
    }`;
  })();

  const mcpText = (() => {
    if (mcpServerCount === 0 && blockedMcpServerCount === 0) {
      return '';
    }

    const parts = [];
    if (mcpServerCount > 0) {
      parts.push(
        `${mcpServerCount} MCP server${mcpServerCount > 1 ? 's' : ''}`,
      );
    }

    if (blockedMcpServerCount > 0) {
      let blockedText = `${blockedMcpServerCount} Blocked`;
      if (mcpServerCount === 0) {
        blockedText += ` MCP server${blockedMcpServerCount > 1 ? 's' : ''}`;
      }
      parts.push(blockedText);
    }
    let text = parts.join(', ');
    // Add ctrl+t hint when MCP servers are available
    if (mcpServers && Object.keys(mcpServers).length > 0) {
      if (showToolDescriptions) {
        text += ' (ctrl+t to toggle)';
      } else {
        text += ' (ctrl+t to view)';
      }
    }
    return text;
  })();

  const summaryParts = [openFilesText, geminiMdText, mcpText].filter(Boolean);

  if (isNarrow) {
    return (
      <Box flexDirection="column">
        <Text color={theme.text.secondary}>Using:</Text>
        {summaryParts.map((part, index) => (
          <Text key={index} color={theme.text.secondary}>
            {'  '}- {part}
          </Text>
        ))}
      </Box>
    );
  }

  return (
    <Box>
      <Text color={theme.text.secondary}>
        Using: {summaryParts.join(' | ')}
      </Text>
    </Box>
  );
};
