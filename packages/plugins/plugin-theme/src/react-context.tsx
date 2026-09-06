//
// Copyright 2025 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Effect from 'effect/Effect';
import * as Atom from 'effect/unstable/reactivity/Atom';
import type * as Registry from 'effect/unstable/reactivity/AtomRegistry';
import React, { ReactNode } from 'react';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { type ThemeMode, ThemeProvider, type ThemeProviderProps, Toast, Tooltip } from '@dxos/react-ui';
import { defaultTx } from '@dxos/react-ui';
import { ACCENT_HUES, type AccentHue, applyAccent } from '@dxos/ui-theme';

import { meta } from '#meta';
import { Settings, ThemeCapabilities } from '#types';

export type ThemePluginOptions = Partial<Pick<ThemeProviderProps, 'tx' | 'resourceExtensions'>> & {
  appName?: string;
  platform?: 'mobile' | 'desktop';
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

// Parse the settings from a cross-tab `storage` event value; `Atom.kvs` stores the settings object
// as a single JSON string. Anything malformed falls back to the defaults.
const parseSettings = (value: string | null): Settings.Settings => {
  if (!value) {
    return {};
  }
  try {
    const parsed: unknown = JSON.parse(value);
    const { appearance, accent } = isRecord(parsed) ? parsed : {};
    return {
      ...((appearance === 'light' || appearance === 'dark') && { appearance }),
      ...(typeof accent === 'string' && ACCENT_HUES.some((hue) => hue === accent) && { accent: accent as AccentHue }),
    };
  } catch {
    return {};
  }
};

export default Capability.makeModule(
  Effect.fnUntraced(function* ({ tx: propsTx = defaultTx, platform }: ThemePluginOptions = {}) {
    const registry: Registry.AtomRegistry = yield* Capabilities.AtomRegistry;
    const settingsAtom = yield* ThemeCapabilities.Settings;
    const themeAtom = Atom.make<{ themeMode: ThemeMode }>({ themeMode: 'dark' }).pipe(Atom.keepAlive);

    const modeQuery = window.matchMedia('(prefers-color-scheme: dark)');

    // 'system' follows the OS; 'light'/'dark' override it. The accent rewrites the accent role tokens on
    // the root, or clears them back to the stylesheet's default.
    const applyTheme = ({ appearance = 'system', accent }: Settings.Settings) => {
      const dark = appearance === 'system' ? modeQuery.matches : appearance === 'dark';
      document.documentElement.classList[dark ? 'add' : 'remove']('dark');
      applyAccent(document.documentElement, accent);
      registry.set(themeAtom, { themeMode: dark ? 'dark' : 'light' });
    };

    // Apply the persisted setting synchronously to avoid a flash on load.
    applyTheme(registry.get(settingsAtom));

    // System preference changes (observed while appearance is 'system').
    const handleModeChange = () => applyTheme(registry.get(settingsAtom));
    modeQuery.addEventListener('change', handleModeChange);

    // In-tab setting changes.
    const unsubscribe = registry.subscribe(settingsAtom, (settings) => applyTheme(settings));

    // Cross-tab setting changes: `Atom.kvs` does not observe the `storage` event,
    // so re-apply from the written value to keep every tab in the same browser in sync.
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== meta.profile.key) {
        return;
      }
      applyTheme(parseSettings(event.newValue));
    };
    window.addEventListener('storage', handleStorage);

    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        modeQuery.removeEventListener('change', handleModeChange);
        window.removeEventListener('storage', handleStorage);
        unsubscribe();
      }),
    );
    return Capability.contribute(Capabilities.ReactContext, {
      id: meta.profile.key,
      context: ({ children }: { children?: ReactNode }) => {
        const { themeMode } = useAtomValue(themeAtom);
        // Translations are registered in the shared i18next instance by the Translator module; the
        // theme provider only exposes that instance to React.
        return (
          <ThemeProvider {...{ tx: propsTx, themeMode, platform }}>
            <Toast.Provider>
              <Tooltip.Provider delayDuration={1_000} skipDelayDuration={100} disableHoverableContent>
                {children}
              </Tooltip.Provider>
              <Toast.Viewport />
            </Toast.Provider>
          </ThemeProvider>
        );
      },
    });
  }),
);
