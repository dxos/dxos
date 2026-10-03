//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import React, { type PropsWithChildren, useEffect } from 'react';

// Next components style through `.dx-*` rules that ship separately from the theme.
import '@dxos/react-ui/theme.css';
import * as ErrorFallback from '@dxos/react-ui/ErrorFallback';
import * as ThemeProvider from '@dxos/react-ui/ThemeProvider';

import { translations } from '../../translations.ts';

/**
 * Wraps children with the app theme, tooltip provider, and a named error boundary.
 */
export const Root = ({ children, name }: PropsWithChildren<Pick<ErrorFallback.ErrorBoundaryProps, 'name'>>) => {
  // Monitor system theme.
  useEffect(() => {
    const setTheme = (darkMode: boolean) => {
      document.documentElement.classList[darkMode ? 'add' : 'remove']('dark');
    };
    const handleThemeChange = (event: MediaQueryListEvent) => setTheme(event.matches);
    setTheme(window.matchMedia('(prefers-color-scheme: dark)').matches);
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    query.addEventListener('change', handleThemeChange);
    return () => query.removeEventListener('change', handleThemeChange);
  }, []);

  return (
    <ThemeProvider.ThemeProvider tx={ThemeProvider.defaultTx} resourceExtensions={translations} themeMode='dark'>
      <ErrorFallback.ErrorBoundary name={name}>{children}</ErrorFallback.ErrorBoundary>
    </ThemeProvider.ThemeProvider>
  );
};
