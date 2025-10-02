/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useState,
  useMemo,
} from 'react';
import { themeManager } from '../themes/theme-manager.js';
import type { Theme, CustomTheme } from '../themes/theme.js';
import type { SemanticColors } from '../themes/semantic-tokens.js';

interface ThemeContextType {
  theme: Theme;
  semanticColors: SemanticColors;
  setTheme: (themeName: string | undefined) => boolean;
  loadCustomThemes: (customThemes?: Record<string, CustomTheme>) => void;
  refreshTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [theme, setThemeState] = useState<Theme>(themeManager.getActiveTheme());

  const refreshTheme = useCallback(() => {
    setThemeState(themeManager.getActiveTheme());
  }, []);

  const loadCustomThemes = useCallback(
    (customThemes?: Record<string, CustomTheme>) => {
      themeManager.loadCustomThemes(customThemes);
      refreshTheme();
    },
    [refreshTheme],
  );

  const setTheme = useCallback(
    (themeName: string | undefined) => {
      const success = themeManager.setActiveTheme(themeName);
      if (success) {
        refreshTheme();
      }
      return success;
    },
    [refreshTheme],
  );

  const value = useMemo(
    () => ({
      theme,
      semanticColors: theme.semanticColors,
      setTheme,
      loadCustomThemes,
      refreshTheme,
    }),
    [theme, setTheme, loadCustomThemes, refreshTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
