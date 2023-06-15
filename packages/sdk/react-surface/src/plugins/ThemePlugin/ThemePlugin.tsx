//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { ThemeMode, ThemeProvider, Toast, Tooltip } from '@dxos/aurora';
import { appTx } from '@dxos/aurora-theme';
import { createStore } from '@dxos/observable-object';

import { definePlugin } from '../../framework';
import compositeEnUs from './translations/en-US';

const themeStore = createStore<{ themeMode: ThemeMode }>({ themeMode: 'dark' });

const setTheme = ({ matches: prefersDark }: { matches?: boolean }) => {
  document.documentElement.classList[prefersDark ? 'add' : 'remove']('dark');
  themeStore.themeMode = prefersDark ? 'dark' : 'light';
};

let modeQuery: MediaQueryList | undefined;

export const ThemePlugin = definePlugin({
  meta: {
    id: 'dxos:ThemePlugin',
  },
  ready: async () => {
    modeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setTheme({ matches: modeQuery.matches });
    modeQuery.addEventListener('change', setTheme);
  },
  unload: async () => {
    return modeQuery?.removeEventListener('change', setTheme);
  },
  provides: {
    context: ({ children }) => (
      <ThemeProvider {...{ tx: appTx, themeMode: themeStore.themeMode, resourceExtensions: [compositeEnUs] }}>
        <Toast.Provider>
          <Tooltip.Provider>{children}</Tooltip.Provider>
          <Toast.Viewport />
        </Toast.Provider>
      </ThemeProvider>
    ),
  },
});
