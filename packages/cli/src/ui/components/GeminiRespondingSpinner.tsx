/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import { Text, useIsScreenReaderEnabled } from 'ink';
import Spinner from 'ink-spinner';
import type { SpinnerName } from 'cli-spinners';
import { useStreamingContext } from '../contexts/StreamingContext.js';
import { StreamingState } from '../types.js';
import {
  SCREEN_READER_LOADING,
  SCREEN_READER_RESPONDING,
} from '../textConstants.js';
import { theme } from '../semantic-colors.js';
import { ThinkingAnimation } from './ThinkingAnimation.js';

type AnimationStyle = 'spinner' | 'braille' | 'japanese' | 'symbols';

interface GeminiRespondingSpinnerProps {
  /**
   * Optional string to display when not in Responding state.
   * If not provided and not Responding, renders null.
   */
  nonRespondingDisplay?: string;
  spinnerType?: SpinnerName;
  animationStyle?: AnimationStyle;
}

export const GeminiRespondingSpinner: React.FC<
  GeminiRespondingSpinnerProps
> = ({
  nonRespondingDisplay,
  spinnerType = 'dots',
  animationStyle = 'japanese',
}) => {
  const streamingState = useStreamingContext();
  const isScreenReaderEnabled = useIsScreenReaderEnabled();
  if (streamingState === StreamingState.Responding) {
    return (
      <GeminiSpinner
        spinnerType={spinnerType}
        animationStyle={animationStyle}
        altText={SCREEN_READER_RESPONDING}
      />
    );
  } else if (nonRespondingDisplay) {
    return isScreenReaderEnabled ? (
      <Text>{SCREEN_READER_LOADING}</Text>
    ) : (
      <Text color={theme.text.primary}>{nonRespondingDisplay}</Text>
    );
  }
  return null;
};

interface GeminiSpinnerProps {
  spinnerType?: SpinnerName;
  animationStyle?: AnimationStyle;
  altText?: string;
}

export const GeminiSpinner: React.FC<GeminiSpinnerProps> = ({
  spinnerType = 'dots',
  animationStyle = 'japanese',
  altText,
}) => {
  const isScreenReaderEnabled = useIsScreenReaderEnabled();

  if (isScreenReaderEnabled) {
    return <Text>{altText}</Text>;
  }

  if (animationStyle === 'spinner') {
    return (
      <Text color={theme.text.primary}>
        <Spinner type={spinnerType} />
      </Text>
    );
  }

  // Use ThinkingAnimation for braille, japanese, or symbols
  const gradientColors = theme.ui.gradient || ['#ec4899', '#8b5cf6'];
  const colorA = gradientColors[0] || '#ec4899';
  const colorB = gradientColors[1] || gradientColors[0] || '#8b5cf6';

  return (
    <ThinkingAnimation
      size={15}
      gradColorA={colorA}
      gradColorB={colorB}
      cycleColors={true}
      runeSet={animationStyle}
    />
  );
};
