/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { render } from 'ink-testing-library';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Header } from './Header.js';
import * as useTerminalSize from '../hooks/useTerminalSize.js';

vi.mock('../hooks/useTerminalSize.js');

vi.mock('../contexts/ThemeContext.js', () => ({
  useTheme: vi.fn(() => ({
    semanticColors: {
      text: {
        primary: '#FFFFFF',
        secondary: '#AAAAAA',
        link: '#3B82F6',
        accent: '#8B5CF6',
      },
      background: {
        primary: '#1E1E2E',
        diff: {
          added: '#28350B',
          removed: '#430000',
        },
      },
      border: {
        default: '#6C7086',
        focused: '#89B4FA',
      },
      ui: {
        comment: '#6C7086',
        symbol: '#89DCEB',
        gradient: ['#4796E4', '#847ACE', '#C3677F'],
      },
      status: {
        error: '#F38BA8',
        success: '#A6E3A1',
        warning: '#F9E2AF',
      },
    },
  })),
}));

describe('<Header />', () => {
  beforeEach(() => {
    vi.spyOn(useTerminalSize, 'useTerminalSize').mockReturnValue({
      columns: 120,
      rows: 20,
    });
  });

  it('renders Alfred BigText and info', () => {
    const { lastFrame } = render(
      <Header
        version="1.0.0"
        model="gemini-2.0-flash-exp"
        targetDir="/Users/test/project"
        nightly={false}
      />,
    );
    // BigText renders as ASCII art, so check for part of the ASCII art
    expect(lastFrame()).toContain('▄▀█');
    expect(lastFrame()).toContain('v1.0.0 · gemini-2.0-flash-exp');
  });

  it('displays version and model on one line with separator', () => {
    const { lastFrame } = render(
      <Header
        version="1.0.0"
        model="gemini-2.0-flash-exp"
        targetDir="/Users/test/project"
        nightly={false}
      />,
    );
    expect(lastFrame()).toContain('v1.0.0 · gemini-2.0-flash-exp');
  });

  it('displays the target directory', () => {
    const { lastFrame } = render(
      <Header
        version="1.0.0"
        model="gemini-2.0-flash-exp"
        targetDir="/Users/test/project"
        nightly={false}
      />,
    );
    expect(lastFrame()).toContain('project');
  });
});
