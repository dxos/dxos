//
// Copyright 2025 DXOS.org
//

import { Atom, type Registry, useAtomValue } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import React, { useMemo } from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { useCapabilities } from '@dxos/app-framework/ui';
import { AppCapabilities } from '@dxos/app-toolkit';
import { type ThemeMode, ThemeProvider, type ThemeProviderProps, Toast, Tooltip } from '@dxos/react-ui';
import { defaultTx } from '@dxos/ui-theme';

import { meta } from './meta';
import compositeEnUs from './translations/en-US';

export type ThemePluginOptions = Partial<Pick<ThemeProviderProps, 'tx' | 'noCache' | 'resourceExtensions'>> & {
  appName?: string;
};

export default Capability.makeModule(
  Effect.fnUntraced(function* (
    { appName, tx: propsTx = defaultTx, resourceExtensions = [], ...rest }: ThemePluginOptions = { appName: 'test' },
  ) {
    const registry: Registry.Registry = yield* Capability.get(Capabilities.AtomRegistry);
    const themeAtom = Atom.make<{ themeMode: ThemeMode }>({ themeMode: 'dark' }).pipe(Atom.keepAlive);

    const setTheme = ({ matches: prefersDark }: { matches?: boolean }) => {
      document.body.classList[prefersDark ? 'add' : 'remove']('dark');
      registry.set(themeAtom, { themeMode: prefersDark ? 'dark' : 'light' });
    };

    const modeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setTheme({ matches: modeQuery.matches });
    modeQuery.addEventListener('change', setTheme);

    return Capability.contributes(
      Capabilities.ReactContext,
      {
        id: meta.id,
        context: ({ children }: { children?: React.ReactNode }) => {
          const _resources = useCapabilities(AppCapabilities.Translations);
          const { themeMode } = useAtomValue(themeAtom);
          const resources = useMemo(
            () => [compositeEnUs(appName), ...resourceExtensions, ..._resources.flat()],
            [appName, resourceExtensions, _resources],
          );

          return (
            <ThemeProvider {...{ tx: propsTx, themeMode, resourceExtensions: resources, ...rest }}>
              <Toast.Provider>
                <Tooltip.Provider delayDuration={1_000} skipDelayDuration={100} disableHoverableContent>
                  {children}
                </Tooltip.Provider>
                <Toast.Viewport />
              </Toast.Provider>
            </ThemeProvider>
          );
        },
      },
      () =>
        Effect.sync(() => {
          modeQuery.removeEventListener('change', setTheme);
        }),
    );
  }),
);
