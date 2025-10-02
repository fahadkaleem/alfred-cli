/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { type MutableRefObject } from 'react';
import { render } from 'ink-testing-library';
import { renderHook } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import { ThemeProvider, useTheme } from './ThemeContext.js';
import { themeManager } from '../themes/theme-manager.js';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../themes/theme-manager.js', () => ({
  themeManager: {
    getActiveTheme: vi.fn(() => ({
      name: 'dark',
      type: 'dark',
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
    setActiveTheme: vi.fn(() => true),
    loadCustomThemes: vi.fn(),
  },
}));

/**
 * A test harness component that uses the hook and exposes the context value
 * via a mutable ref. This allows us to interact with the context's functions
 * and assert against its state directly in our tests.
 */
const TestHarness = ({
  contextRef,
}: {
  contextRef: MutableRefObject<ReturnType<typeof useTheme> | undefined>;
}) => {
  contextRef.current = useTheme();
  return null;
};

describe('ThemeContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should provide the correct initial state', () => {
    const contextRef: MutableRefObject<
      ReturnType<typeof useTheme> | undefined
    > = { current: undefined };

    render(
      <ThemeProvider>
        <TestHarness contextRef={contextRef} />
      </ThemeProvider>,
    );

    expect(contextRef.current?.theme.name).toBe('dark');
    expect(contextRef.current?.semanticColors).toBeDefined();
    expect(contextRef.current?.semanticColors.text.primary).toBe('#FFFFFF');
  });

  it('should update theme when setTheme is called', () => {
    const contextRef: MutableRefObject<
      ReturnType<typeof useTheme> | undefined
    > = { current: undefined };

    render(
      <ThemeProvider>
        <TestHarness contextRef={contextRef} />
      </ThemeProvider>,
    );

    const newTheme = {
      name: 'light',
      type: 'light' as const,
      semanticColors: {
        text: {
          primary: '#000000',
          secondary: '#555555',
          link: '#0000FF',
          accent: '#8B5CF6',
        },
        background: {
          primary: '#FFFFFF',
          diff: {
            added: '#C6EAD8',
            removed: '#FFCCCC',
          },
        },
        border: {
          default: '#CCCCCC',
          focused: '#3B82F6',
        },
        ui: {
          comment: '#008000',
          symbol: '#06B6D4',
          gradient: ['#4796E4', '#847ACE', '#C3677F'],
        },
        status: {
          error: '#DD4C4C',
          success: '#3CA84B',
          warning: '#D5A40A',
        },
      },
    };

    vi.mocked(themeManager.getActiveTheme).mockReturnValue(
      newTheme as ReturnType<typeof themeManager.getActiveTheme>,
    );

    act(() => {
      contextRef.current?.setTheme('light');
    });

    expect(themeManager.setActiveTheme).toHaveBeenCalledWith('light');
    expect(contextRef.current?.theme.name).toBe('light');
  });

  it('should return false when setTheme fails', () => {
    const contextRef: MutableRefObject<
      ReturnType<typeof useTheme> | undefined
    > = { current: undefined };

    render(
      <ThemeProvider>
        <TestHarness contextRef={contextRef} />
      </ThemeProvider>,
    );

    vi.mocked(themeManager.setActiveTheme).mockReturnValue(false);

    let result: boolean | undefined;
    act(() => {
      result = contextRef.current?.setTheme('nonexistent');
    });

    expect(result).toBe(false);
    expect(themeManager.setActiveTheme).toHaveBeenCalledWith('nonexistent');
  });

  it('should load custom themes and refresh', () => {
    const contextRef: MutableRefObject<
      ReturnType<typeof useTheme> | undefined
    > = { current: undefined };

    render(
      <ThemeProvider>
        <TestHarness contextRef={contextRef} />
      </ThemeProvider>,
    );

    const customThemes = {
      myCustomTheme: {
        type: 'custom' as const,
        name: 'myCustomTheme',
        text: { primary: '#FF0000' },
      },
    };

    act(() => {
      contextRef.current?.loadCustomThemes(customThemes);
    });

    expect(themeManager.loadCustomThemes).toHaveBeenCalledWith(customThemes);
    expect(themeManager.getActiveTheme).toHaveBeenCalled();
  });

  it('should refresh theme when refreshTheme is called', () => {
    const contextRef: MutableRefObject<
      ReturnType<typeof useTheme> | undefined
    > = { current: undefined };

    render(
      <ThemeProvider>
        <TestHarness contextRef={contextRef} />
      </ThemeProvider>,
    );

    const initialCallCount = vi.mocked(themeManager.getActiveTheme).mock.calls
      .length;

    act(() => {
      contextRef.current?.refreshTheme();
    });

    expect(vi.mocked(themeManager.getActiveTheme).mock.calls.length).toBe(
      initialCallCount + 1,
    );
  });

  it('should throw an error when useTheme is used outside of a provider', () => {
    // Suppress console.error for this test since we expect an error
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    try {
      // Expect renderHook itself to throw when the hook is used outside a provider
      expect(() => {
        renderHook(() => useTheme());
      }).toThrow('useTheme must be used within a ThemeProvider');
    } finally {
      consoleSpy.mockRestore();
    }
  });
});
