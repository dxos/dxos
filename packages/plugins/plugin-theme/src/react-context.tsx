//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { Capabilities, contributes } from '@dxos/app-framework';
import { useCapabilities } from '@dxos/app-framework/react';
import { live } from '@dxos/live-object';
import { type ThemeMode, ThemeProvider, type ThemeProviderProps, Toast, Tooltip } from '@dxos/react-ui';
import { defaultTx } from '@dxos/react-ui-theme';

import { meta } from './meta';
import compositeEnUs from './translations/en-US';

export type ThemePluginOptions = Partial<Pick<ThemeProviderProps, 'tx' | 'noCache' | 'resourceExtensions'>> & {
  appName?: string;
};

export default (
  { appName, tx: propsTx = defaultTx, resourceExtensions = [], ...rest }: ThemePluginOptions = { appName: 'test' },
) => {
  const state = live<{ themeMode: ThemeMode }>({ themeMode: 'dark' });

  const setTheme = ({ matches: prefersDark }: { matches?: boolean }) => {
    document.documentElement.classList[prefersDark ? 'add' : 'remove']('dark');
    state.themeMode = prefersDark ? 'dark' : 'light';
  };

  const modeQuery = window.matchMedia('(prefers-color-scheme: dark)');
  setTheme({ matches: modeQuery.matches });
  modeQuery.addEventListener('change', setTheme);

  return contributes(
    Capabilities.ReactContext,
    {
      id: meta.id,
      context: ({ children }) => {
        const _resources = useCapabilities(Capabilities.Translations);
        const resources = useMemo(
          () => [compositeEnUs(appName), ...resourceExtensions, ..._resources.flat()],
          [appName, resourceExtensions, _resources],
        );

        return (
          <ThemeProvider {...{ tx: propsTx, themeMode: state.themeMode, resourceExtensions: resources, ...rest }}>
            <Toast.Provider>
              <Tooltip.Provider delayDuration={2_000} skipDelayDuration={100} disableHoverableContent>
                {children}
              </Tooltip.Provider>
              <Toast.Viewport />
            </Toast.Provider>
          </ThemeProvider>
        );
      },
    },
    () => {
      modeQuery.removeEventListener('change', setTheme);
    },
  );
};
