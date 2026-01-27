//
// Copyright 2025 DXOS.org
//

import { Atom, type Registry, useAtomValue } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import React, { useMemo } from 'react';

import { Capability, Common } from '@dxos/app-framework';
import { useCapabilities } from '@dxos/app-framework/react';
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
    const registry: Registry.Registry = yield* Capability.get(Common.Capability.AtomRegistry);
    const themeAtom = Atom.make<{ themeMode: ThemeMode }>({ themeMode: 'dark' }).pipe(Atom.keepAlive);

    const setTheme = ({ matches: prefersDark }: { matches?: boolean }) => {
      document.documentElement.classList[prefersDark ? 'add' : 'remove']('dark');
      registry.set(themeAtom, { themeMode: prefersDark ? 'dark' : 'light' });
    };

    const modeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setTheme({ matches: modeQuery.matches });
    modeQuery.addEventListener('change', setTheme);

    return Capability.contributes(
      Common.Capability.ReactContext,
      {
        id: meta.id,
        context: ({ children }: { children?: React.ReactNode }) => {
          const _resources = useCapabilities(Common.Capability.Translations);
          const { themeMode } = useAtomValue(themeAtom);
          const resources = useMemo(
            () => [compositeEnUs(appName), ...resourceExtensions, ..._resources.flat()],
            [appName, resourceExtensions, _resources],
          );

          return (
            <ThemeProvider {...{ tx: propsTx, themeMode, resourceExtensions: resources, ...rest }}>
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
      () =>
        Effect.sync(() => {
          modeQuery.removeEventListener('change', setTheme);
        }),
    );
  }),
);
