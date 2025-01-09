//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { Capabilities, contributes, useCapabilities } from '@dxos/app-framework/next';
import { create } from '@dxos/live-object';
import { type ThemeContextValue, type ThemeMode, ThemeProvider, Toast, Tooltip } from '@dxos/react-ui';
import { defaultTx } from '@dxos/react-ui-theme';

import meta from './meta';
import compositeEnUs from './translations/en-US';

export type ThemePluginOptions = Partial<Pick<ThemeContextValue, 'tx' | 'noCache'>> & {
  appName?: string;
};

export default ({ appName, tx: propsTx = defaultTx, ...rest }: ThemePluginOptions = { appName: 'test' }) => {
  const state = create<{ themeMode: ThemeMode }>({ themeMode: 'dark' });

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
        const _resources = useCapabilities(Capabilities.Translations).flat();
        const resources = useMemo(() => [compositeEnUs(appName), ..._resources], [_resources]);

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
