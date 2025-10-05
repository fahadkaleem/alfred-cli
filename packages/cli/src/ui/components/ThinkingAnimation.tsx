/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable react/prop-types */

import { useState, useEffect, useMemo } from 'react';
import { Box, Text } from 'ink';

const AVAILABLE_RUNES = '0123456789abcdefABCDEF~!@#$£€%^&*()+=_'.split('');
const BRAILLE_PATTERNS =
  '⠀⠁⠂⠃⠄⠅⠆⠇⠈⠉⠊⠋⠌⠍⠎⠏⠐⠑⠒⠓⠔⠕⠖⠗⠘⠙⠚⠛⠜⠝⠞⠟⡀⡁⡂⡃⢀⢁⢂⢃⣀⣁⣂⣃⣿⣾⣽⣼⣻⣺'.split('');
const JAPANESE = [
  ...'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン'.split(
    '',
  ),
  ...'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん'.split(
    '',
  ),
];

const FPS = 18;
const FRAME_INTERVAL = 1000 / FPS;
const MAX_BIRTH_OFFSET = 1000;
const INITIAL_CHAR = '.';

interface Color {
  r: number;
  g: number;
  b: number;
}

type RuneSet = 'symbols' | 'braille' | 'japanese';

export interface ThinkingAnimationProps {
  size?: number;
  gradColorA?: string;
  gradColorB?: string;
  cycleColors?: boolean;
  runeSet?: RuneSet;
}

function hexToRgb(hex: string): Color {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 255, g: 0, b: 0 };
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b].map((x) => Math.round(x).toString(16).padStart(2, '0')).join('')
  );
}

function hclToRgb(h: number, c: number, l: number): Color {
  const y = l;
  const u = c * Math.cos((h * Math.PI) / 180);
  const v = c * Math.sin((h * Math.PI) / 180);

  let r = y + 1.402 * v;
  let g = y - 0.344 * u - 0.714 * v;
  let b = y + 1.772 * u;

  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));

  return { r, g, b };
}

function rgbToHcl(rgb: Color): { h: number; c: number; l: number } {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  const y = r;
  const u = -0.169 * r - 0.331 * g + 0.5 * b;
  const v = 0.5 * r - 0.419 * g - 0.081 * b;

  const l = y;
  const c = Math.sqrt(u * u + v * v);
  let h = (Math.atan2(v, u) * 180) / Math.PI;
  if (h < 0) h += 360;

  return { h, c: c * 255, l: l * 255 };
}

function blendHcl(c1: Color, c2: Color, t: number): Color {
  const hcl1 = rgbToHcl(c1);
  const hcl2 = rgbToHcl(c2);

  const h = hcl1.h + (hcl2.h - hcl1.h) * t;
  const c = hcl1.c + (hcl2.c - hcl1.c) * t;
  const l = hcl1.l + (hcl2.l - hcl1.l) * t;

  return hclToRgb(h, c, l);
}

function makeGradientRamp(size: number, stops: Color[]): Color[] {
  if (stops.length < 2) return [];

  const numSegments = stops.length - 1;
  const blended: Color[] = [];
  const segmentSizes: number[] = [];
  const baseSize = Math.floor(size / numSegments);
  const remainder = size % numSegments;

  for (let i = 0; i < numSegments; i++) {
    segmentSizes[i] = baseSize;
    if (i < remainder) {
      segmentSizes[i]++;
    }
  }

  for (let i = 0; i < numSegments; i++) {
    const c1 = stops[i];
    const c2 = stops[i + 1];
    const segmentSize = segmentSizes[i];

    for (let j = 0; j < segmentSize; j++) {
      const t = segmentSize === 0 ? 0 : j / segmentSize;
      const blendedColor = blendHcl(c1, c2, t);
      blended.push(blendedColor);
    }
  }

  return blended;
}

export const ThinkingAnimation: React.FC<ThinkingAnimationProps> = ({
  size = 10,
  gradColorA = '#ec4899',
  gradColorB = '#8b5cf6',
  cycleColors = true,
  runeSet = 'braille',
}) => {
  const [step, setStep] = useState(0);
  const [startTime] = useState(Date.now());
  const [initialized, setInitialized] = useState(false);

  const birthOffsets = useMemo(
    () => Array.from({ length: size }, () => Math.random() * MAX_BIRTH_OFFSET),
    [size],
  );

  const { gradient, numFrames } = useMemo(() => {
    const colorA = hexToRgb(gradColorA);
    const colorB = hexToRgb(gradColorB);

    let ramp: Color[];
    let frames: number;

    if (cycleColors) {
      ramp = makeGradientRamp(size * 3, [colorA, colorB, colorA, colorB]);
      frames = size * 2;
    } else {
      ramp = makeGradientRamp(size, [colorA, colorB]);
      frames = 10;
    }

    return { gradient: ramp, numFrames: frames };
  }, [size, gradColorA, gradColorB, cycleColors]);

  const cyclingFrames = useMemo(() => {
    const frames: Array<Array<{ char: string; color: string }>> = [];
    let offset = 0;

    const runeMap: Record<RuneSet, string[]> = {
      symbols: AVAILABLE_RUNES,
      braille: BRAILLE_PATTERNS,
      japanese: JAPANESE,
    };

    const runes = runeMap[runeSet];

    for (let i = 0; i < numFrames; i++) {
      const frame: Array<{ char: string; color: string }> = [];
      for (let j = 0; j < size; j++) {
        const colorIndex = j - offset;
        const wrappedIndex =
          ((colorIndex % gradient.length) + gradient.length) % gradient.length;
        const color = gradient[wrappedIndex];
        const char = runes[Math.floor(Math.random() * runes.length)];
        frame.push({ char, color: rgbToHex(color.r, color.g, color.b) });
      }
      frames.push(frame);
      if (cycleColors) {
        offset++;
      }
    }

    return frames;
  }, [size, gradient, numFrames, cycleColors, runeSet]);

  useEffect(() => {
    const timer = setInterval(() => {
      setStep((prev) => (prev + 1) % numFrames);
      if (!initialized && Date.now() - startTime >= MAX_BIRTH_OFFSET) {
        setInitialized(true);
      }
    }, FRAME_INTERVAL);

    return () => clearInterval(timer);
  }, [numFrames, initialized, startTime]);

  const currentFrame = cyclingFrames[step] || [];
  const elapsed = Date.now() - startTime;

  return (
    <Box>
      {currentFrame.map((item, i) => {
        const shouldShow = initialized || elapsed >= birthOffsets[i];
        if (shouldShow) {
          return (
            <Text key={`char-${i}`} color={item.color}>
              {item.char}
            </Text>
          );
        } else {
          return (
            <Text key={`char-${i}`} color={gradColorA}>
              {INITIAL_CHAR}
            </Text>
          );
        }
      })}
    </Box>
  );
};
