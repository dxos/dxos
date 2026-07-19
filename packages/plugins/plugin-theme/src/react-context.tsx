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
import { Settings, ThemeCapabilities } from './types';

export type ThemePluginOptions = Partial<Pick<ThemeProviderProps, 'tx' | 'noCache' | 'resourceExtensions'>> & {
  appName?: string;
  platform?: 'mobile' | 'desktop';
};

// Parse the appearance from a cross-tab `storage` event value; `Atom.kvs` stores
// the settings object as a single JSON string. Fall back to 'system' on any
// malformed value.
const parseAppearance = (value: string | null): Settings.Appearance => {
  if (!value) {
    return 'system';
  }
  try {
    const parsed: unknown = JSON.parse(value);
    const appearance =
      typeof parsed === 'object' && parsed !== null && 'appearance' in parsed ? parsed.appearance : undefined;
    return appearance === 'light' || appearance === 'dark' ? appearance : 'system';
  } catch {
    return 'system';
  }
};

export default Capability.makeModule(
  Effect.fnUntraced(function* ({ tx: propsTx = defaultTx, noCache, platform }: ThemePluginOptions = {}) {
    const registry: Registry.Registry = yield* Capability.get(Capabilities.AtomRegistry);
    const settingsAtom = yield* Capability.get(ThemeCapabilities.Settings);
    const themeAtom = Atom.make<{ themeMode: ThemeMode }>({ themeMode: 'dark' }).pipe(Atom.keepAlive);

    const modeQuery = window.matchMedia('(prefers-color-scheme: dark)');

    // 'system' follows the OS; 'light'/'dark' override it.
    const applyTheme = (appearance: Settings.Appearance) => {
      const dark = appearance === 'system' ? modeQuery.matches : appearance === 'dark';
      document.documentElement.classList[dark ? 'add' : 'remove']('dark');
      registry.set(themeAtom, { themeMode: dark ? 'dark' : 'light' });
    };

    const currentAppearance = (): Settings.Appearance => registry.get(settingsAtom).appearance ?? 'system';

    // Apply the persisted setting synchronously to avoid a flash on load.
    applyTheme(currentAppearance());

    // System preference changes (observed while appearance is 'system').
    const handleModeChange = () => applyTheme(currentAppearance());
    modeQuery.addEventListener('change', handleModeChange);

    // In-tab setting changes.
    const unsubscribe = registry.subscribe(settingsAtom, (settings) => applyTheme(settings.appearance ?? 'system'));

    // Cross-tab setting changes: `Atom.kvs` does not observe the `storage` event,
    // so re-apply from the written value to keep every tab in the same browser in sync.
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== meta.profile.key) {
        return;
      }
      applyTheme(parseAppearance(event.newValue));
    };
    window.addEventListener('storage', handleStorage);

    return Capability.contributes(
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
          modeQuery.removeEventListener('change', handleModeChange);
          window.removeEventListener('storage', handleStorage);
          unsubscribe();
        }),
    );
  }),
);
