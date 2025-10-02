/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import { Box, Text } from 'ink';
import { theme } from '../semantic-colors.js';
import { shortenPath, tildeifyPath } from '@alfred/alfred-cli-core';
import { ConsoleSummaryDisplay } from './ConsoleSummaryDisplay.js';
import Gradient from 'ink-gradient';
import { MemoryUsageDisplay } from './MemoryUsageDisplay.js';
import { ContextUsageDisplay } from './ContextUsageDisplay.js';
import { DebugProfiler } from './DebugProfiler.js';
import { useTerminalSize } from '../hooks/useTerminalSize.js';

import { useUIState } from '../contexts/UIStateContext.js';
import { useConfig } from '../contexts/ConfigContext.js';
import { useSettings } from '../contexts/SettingsContext.js';
import { useVimMode } from '../contexts/VimModeContext.js';

export const Footer: React.FC = () => {
  const uiState = useUIState();
  const config = useConfig();
  const settings = useSettings();
  const { vimEnabled, vimMode } = useVimMode();

  const {
    model,
    targetDir,
    debugMode,
    branchName,
    debugMessage,
    errorCount,
    showErrorDetails,
    promptTokenCount,
    nightly,
    isTrustedFolder,
  } = {
    model: config.getModel(),
    targetDir: config.getTargetDir(),
    debugMode: config.getDebugMode(),
    branchName: uiState.branchName,
    debugMessage: uiState.debugMessage,
    errorCount: uiState.errorCount,
    showErrorDetails: uiState.showErrorDetails,
    promptTokenCount: uiState.sessionStats.lastPromptTokenCount,
    nightly: uiState.nightly,
    isTrustedFolder: uiState.isTrustedFolder,
  };

  const showMemoryUsage =
    config.getDebugMode() || settings.merged.ui?.showMemoryUsage || false;
  const hideCWD = settings.merged.ui?.footer?.hideCWD || false;
  const hideModelInfo = settings.merged.ui?.footer?.hideModelInfo || false;

  const { columns: terminalWidth } = useTerminalSize();

  const pathLength = Math.max(20, Math.floor(terminalWidth * 0.25));
  const displayPath = shortenPath(tildeifyPath(targetDir), pathLength);

  const justifyContent = hideCWD && hideModelInfo ? 'center' : 'space-between';
  const displayVimMode = vimEnabled ? vimMode : undefined;

  return (
    <Box
      justifyContent={justifyContent}
      width="100%"
      flexDirection="row"
      alignItems="center"
    >
      {(debugMode || displayVimMode || !hideCWD) && (
        <Box>
          {debugMode && <DebugProfiler />}
          {displayVimMode && (
            <Text color={theme.text.secondary}>[{displayVimMode}] </Text>
          )}
          {!hideCWD &&
            (nightly ? (
              <Gradient colors={theme.ui.gradient}>
                <Text>
                  {displayPath}
                  {branchName && <Text> ({branchName}*)</Text>}
                </Text>
              </Gradient>
            ) : (
              <Text color={theme.text.link}>
                {displayPath}
                {branchName && (
                  <Text color={theme.text.secondary}> ({branchName}*)</Text>
                )}
              </Text>
            ))}
          {debugMode && (
            <Text color={theme.status.error}>
              {' ' + (debugMessage || '--debug')}
            </Text>
          )}
        </Box>
      )}

      {/* Middle Section: Centered Trust Info */}
      {isTrustedFolder === false && (
        <Box
          flexGrow={1}
          alignItems="center"
          justifyContent="center"
          display="flex"
        >
          <Text color={theme.status.warning}>untrusted</Text>
        </Box>
      )}

      {/* Right Section: Gemini Label and Console Summary */}
      {!hideModelInfo && (
        <Box alignItems="center" justifyContent="flex-end">
          <Box alignItems="center">
            <Text color={theme.text.accent}>
              {model}{' '}
              <ContextUsageDisplay
                promptTokenCount={promptTokenCount}
                model={model}
                terminalWidth={terminalWidth}
              />
            </Text>
            {showMemoryUsage && <MemoryUsageDisplay />}
          </Box>
          <Box alignItems="center" paddingLeft={2}>
            {!showErrorDetails && errorCount > 0 && (
              <Box>
                <Text color={theme.ui.symbol}>| </Text>
                <ConsoleSummaryDisplay errorCount={errorCount} />
              </Box>
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
};
