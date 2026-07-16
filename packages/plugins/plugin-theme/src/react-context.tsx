//
// Copyright 2025 DXOS.org
//

import { Atom, type Registry, useAtomValue } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import React, { ReactNode } from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { type ThemeMode, ThemeProvider, type ThemeProviderProps, Toast, Tooltip } from '@dxos/react-ui';
import { defaultTx } from '@dxos/react-ui';

import { meta } from './meta';

export type ThemePluginOptions = Partial<Pick<ThemeProviderProps, 'tx' | 'noCache' | 'resourceExtensions'>> & {
  appName?: string;
  platform?: 'mobile' | 'desktop';
};

export default Capability.makeModule(
  Effect.fnUntraced(function* ({ tx: propsTx = defaultTx, noCache, platform }: ThemePluginOptions = {}) {
    const registry: Registry.Registry = yield* Capabilities.AtomRegistry;
    const themeAtom = Atom.make<{ themeMode: ThemeMode }>({ themeMode: 'dark' }).pipe(Atom.keepAlive);

    const setTheme = ({ matches: prefersDark }: { matches?: boolean }) => {
      document.documentElement.classList[prefersDark ? 'add' : 'remove']('dark');
      registry.set(themeAtom, { themeMode: prefersDark ? 'dark' : 'light' });
    };

    const modeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setTheme({ matches: modeQuery.matches });
    modeQuery.addEventListener('change', setTheme);

    return [
      Capability.provide(
        Capabilities.ReactContext,
        {
          id: meta.profile.key,
          context: ({ children }: { children?: ReactNode }) => {
            const { themeMode } = useAtomValue(themeAtom);
            // Translations are registered in the shared i18next instance by the Translator module; the
            // theme provider only exposes that instance to React.
            return (
              <ThemeProvider {...{ tx: propsTx, themeMode, platform, noCache }}>
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
      ),
    ];
  }),
);
