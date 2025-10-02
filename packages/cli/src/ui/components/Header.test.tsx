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
