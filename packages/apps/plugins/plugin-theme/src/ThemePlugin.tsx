//
// Copyright 2023 DXOS.org
//

import type { Resource } from 'i18next';
import React from 'react';

import { filterPlugins, parseTranslationsPlugin, type PluginDefinition } from '@dxos/app-framework';
import { create } from '@dxos/echo-schema';
import { type ThemeFunction, type ThemeMode, ThemeProvider, Toast, Tooltip } from '@dxos/react-ui';
import { defaultTx } from '@dxos/react-ui-theme';

import meta from './meta';
import compositeEnUs from './translations/en-US';

export type ThemePluginOptions = {
  appName?: string;
  tx?: ThemeFunction<any>;
};

export const ThemePlugin = ({ appName, tx: propsTx }: ThemePluginOptions = { appName: 'test' }): PluginDefinition => {
  const resources: Resource[] = [compositeEnUs(appName)];
  const state = create<{ themeMode: ThemeMode }>({ themeMode: 'dark' });
  let modeQuery: MediaQueryList | undefined;

  const setTheme = ({ matches: prefersDark }: { matches?: boolean }) => {
    document.documentElement.classList[prefersDark ? 'add' : 'remove']('dark');
    state.themeMode = prefersDark ? 'dark' : 'light';
  };

  return {
    meta,
    ready: async (plugins) => {
      modeQuery = window.matchMedia('(prefers-color-scheme: dark)');
      setTheme({ matches: modeQuery.matches });
      modeQuery.addEventListener('change', setTheme);
      for (const plugin of filterPlugins(plugins, parseTranslationsPlugin)) {
        resources.push(...plugin.provides.translations);
      }
    },
    unload: async () => {
      return modeQuery?.removeEventListener('change', setTheme);
    },
    provides: {
      context: ({ children }) => {
        return (
          <ThemeProvider {...{ tx: propsTx ?? defaultTx, themeMode: state.themeMode, resourceExtensions: resources }}>
            <Toast.Provider>
              {/* TODO(burdon): Add option to disable tooltips. */}
              <Tooltip.Provider delayDuration={1000} skipDelayDuration={100} disableHoverableContent>
                {children}
              </Tooltip.Provider>
              <Toast.Viewport />
            </Toast.Provider>
          </ThemeProvider>
        );
      },
    },
  };
};
