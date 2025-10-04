/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import { useCallback, useContext, useMemo } from 'react';
import { Box, Text } from 'ink';
import {
  DEFAULT_GEMINI_FLASH_LITE_MODEL,
  DEFAULT_GEMINI_FLASH_MODEL,
  DEFAULT_GEMINI_MODEL,
  DEFAULT_GEMINI_MODEL_AUTO,
  DEFAULT_ANTHROPIC_MODEL,
  ANTHROPIC_OPUS_4_1_MODEL,
  ModelSlashCommandEvent,
  logModelSlashCommand,
} from '@alfred/alfred-cli-core';
import { useKeypress } from '../hooks/useKeypress.js';
import { theme } from '../semantic-colors.js';
import { DescriptiveRadioButtonSelect } from './shared/DescriptiveRadioButtonSelect.js';
import { ConfigContext } from '../contexts/ConfigContext.js';

interface ModelDialogProps {
  onClose: () => void;
}

const GEMINI_MODEL_OPTIONS = [
  {
    value: DEFAULT_GEMINI_MODEL_AUTO,
    title: 'Auto (recommended)',
    description: 'Let the system choose the best model for your task',
    key: DEFAULT_GEMINI_MODEL_AUTO,
  },
  {
    value: DEFAULT_GEMINI_MODEL,
    title: 'Pro',
    description: 'For complex tasks that require deep reasoning and creativity',
    key: DEFAULT_GEMINI_MODEL,
  },
  {
    value: DEFAULT_GEMINI_FLASH_MODEL,
    title: 'Flash',
    description: 'For tasks that need a balance of speed and reasoning',
    key: DEFAULT_GEMINI_FLASH_MODEL,
  },
  {
    value: DEFAULT_GEMINI_FLASH_LITE_MODEL,
    title: 'Flash-Lite',
    description: 'For simple tasks that need to be done quickly',
    key: DEFAULT_GEMINI_FLASH_LITE_MODEL,
  },
];

const ANTHROPIC_MODEL_OPTIONS = [
  {
    value: DEFAULT_ANTHROPIC_MODEL,
    title: 'Claude Sonnet 4.5 (recommended)',
    description: 'Most intelligent model, best for complex reasoning',
    key: DEFAULT_ANTHROPIC_MODEL,
  },
  {
    value: ANTHROPIC_OPUS_4_1_MODEL,
    title: 'Claude Opus 4.1',
    description: 'Powerful model for highly complex tasks',
    key: ANTHROPIC_OPUS_4_1_MODEL,
  },
];

export function ModelDialog({ onClose }: ModelDialogProps): React.JSX.Element {
  const config = useContext(ConfigContext);

  // Determine active provider from settings
  const settingsService = config?.getSettingsService();
  const activeProvider = settingsService?.get('activeProvider') as string;

  // Select model options based on active provider
  const modelOptions =
    activeProvider === 'anthropic'
      ? ANTHROPIC_MODEL_OPTIONS
      : GEMINI_MODEL_OPTIONS;

  // Determine the Preferred Model (read once when the dialog opens).
  const preferredModel =
    config?.getModel() ||
    (activeProvider === 'anthropic'
      ? DEFAULT_ANTHROPIC_MODEL
      : DEFAULT_GEMINI_MODEL_AUTO);

  useKeypress(
    (key) => {
      if (key.name === 'escape') {
        onClose();
      }
    },
    { isActive: true },
  );

  // Calculate the initial index based on the preferred model.
  const initialIndex = useMemo(
    () => modelOptions.findIndex((option) => option.value === preferredModel),
    [modelOptions, preferredModel],
  );

  // Handle selection internally (Autonomous Dialog).
  const handleSelect = useCallback(
    (model: string) => {
      if (config) {
        config.setModel(model);
        const event = new ModelSlashCommandEvent(model);
        logModelSlashCommand(config, event);
      }
      onClose();
    },
    [config, onClose],
  );

  const providerName = activeProvider === 'anthropic' ? 'Claude' : 'Gemini';

  return (
    <Box
      borderStyle="round"
      borderColor={theme.border.default}
      flexDirection="column"
      padding={1}
      width="100%"
    >
      <Text bold>Select {providerName} Model</Text>
      <Box marginTop={1}>
        <DescriptiveRadioButtonSelect
          items={modelOptions}
          onSelect={handleSelect}
          initialIndex={initialIndex}
          showNumbers={true}
        />
      </Box>
      <Box flexDirection="column">
        <Text color={theme.text.secondary}>
          {`> To use a specific ${providerName} model, use the --model flag.`}
        </Text>
      </Box>
      <Box marginTop={1} flexDirection="column">
        <Text color={theme.text.secondary}>(Press Esc to close)</Text>
      </Box>
    </Box>
  );
}
