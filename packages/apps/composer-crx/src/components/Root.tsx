//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import React, { type PropsWithChildren, useEffect } from 'react';

import { ErrorBoundary, ErrorBoundaryProps, ThemeProvider, Tooltip } from '@dxos/react-ui';
import { defaultTx } from '@dxos/react-ui';

import { translations } from '../translations';

export const Root = ({ children, name }: PropsWithChildren<Pick<ErrorBoundaryProps, 'name'>>) => {
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
    <ThemeProvider tx={defaultTx} resourceExtensions={translations} themeMode='dark'>
      <Tooltip.Provider>
        <ErrorBoundary name={name}>{children}</ErrorBoundary>
      </Tooltip.Provider>
    </ThemeProvider>
  );
};
