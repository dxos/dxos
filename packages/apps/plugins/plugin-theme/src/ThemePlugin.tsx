//
// Copyright 2023 DXOS.org
//

import { deepSignal } from 'deepsignal/react';
import type { Resource } from 'i18next';
import React from 'react';

import { ThemeFunction, ThemeMode, ThemeProvider, Toast, Tooltip } from '@dxos/aurora';
import { auroraTx } from '@dxos/aurora-theme';
import { PluginDefinition } from '@dxos/react-surface';

import compositeEnUs from './translations/en-US';
import { translationsPlugins } from './util';

export type ThemePluginOptions = {
  appName?: string;
  tx?: ThemeFunction<any>;
};

export const ThemePlugin = ({ appName, tx: propsTx }: ThemePluginOptions = { appName: 'test' }): PluginDefinition => {
  let modeQuery: MediaQueryList | undefined;
  const resources: Resource[] = [compositeEnUs(appName)];
  const state = deepSignal<{ themeMode: ThemeMode }>({ themeMode: 'dark' });

  const setTheme = ({ matches: prefersDark }: { matches?: boolean }) => {
    document.documentElement.classList[prefersDark ? 'add' : 'remove']('dark');
    state.themeMode = prefersDark ? 'dark' : 'light';
  };

  return {
    meta: {
      id: 'dxos.org/plugin/theme',
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
      context: ({ children }) => {
        return (
          <ThemeProvider {...{ tx: propsTx ?? auroraTx, themeMode: state.themeMode, resourceExtensions: resources }}>
            <Toast.Provider>
              <Tooltip.Provider>{children}</Tooltip.Provider>
              <Toast.Viewport />
            </Toast.Provider>
          </ThemeProvider>
        );
      },
    },
  };
};
