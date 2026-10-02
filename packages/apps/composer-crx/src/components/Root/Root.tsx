//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import React, { type PropsWithChildren, useEffect } from 'react';

import * as ErrorFallback from '@dxos/react-ui/ErrorFallback';
import * as ThemeProvider from '@dxos/react-ui/ThemeProvider';
import * as Tooltip from '@dxos/react-ui/Tooltip';

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
    <ThemeProvider.Root tx={ThemeProvider.defaultTx} resourceExtensions={translations} themeMode='dark'>
      <Tooltip.Provider>
        <ErrorFallback.ErrorBoundary name={name}>{children}</ErrorFallback.ErrorBoundary>
      </Tooltip.Provider>
    </ThemeProvider.Root>
  );
};
