//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import React, { type PropsWithChildren, useEffect } from 'react';

import { ThemeProvider, Tooltip } from '@dxos/react-ui';
import { defaultTx, mx } from '@dxos/ui-theme';

import { translations } from '../translations';

export const Container = ({ children, classNames }: PropsWithChildren<{ classNames?: string }>) => {
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
        <div className={mx(classNames)}>{children}</div>
      </Tooltip.Provider>
    </ThemeProvider>
  );
};
