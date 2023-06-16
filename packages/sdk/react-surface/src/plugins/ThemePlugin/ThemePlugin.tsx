//
// Copyright 2023 DXOS.org
//

import type { Resource } from 'i18next';
import React from 'react';

import { ThemeMode, ThemeProvider, Toast, Tooltip } from '@dxos/aurora';
import { appTx } from '@dxos/aurora-theme';
import { createStore } from '@dxos/observable-object';

import { definePlugin, Plugin } from '../../framework';
import compositeEnUs from './translations/en-US';

type TranslationsProvides = {
  translations: Resource[];
};

type TranslationsPlugin = Plugin<TranslationsProvides>;

const resources: Resource[] = [compositeEnUs];

export const translationsPlugins = (plugins: Plugin[]): TranslationsPlugin[] => {
  return (plugins as TranslationsPlugin[]).filter((p) => Array.isArray(p.provides?.translations));
};

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
  ready: async (plugins) => {
    modeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setTheme({ matches: modeQuery.matches });
    modeQuery.addEventListener('change', setTheme);
    for (const plugin of translationsPlugins(plugins)) {
      resources.push(...plugin.provides.translations);
    }
  },
  unload: async () => {
    return modeQuery?.removeEventListener('change', setTheme);
  },
  provides: {
    context: ({ children }) => (
      <ThemeProvider {...{ tx: appTx, themeMode: themeStore.themeMode, resourceExtensions: resources }}>
        <Toast.Provider>
          <Tooltip.Provider>{children}</Tooltip.Provider>
          <Toast.Viewport />
        </Toast.Provider>
      </ThemeProvider>
    ),
  },
});
