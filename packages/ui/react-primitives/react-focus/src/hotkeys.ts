//
// Copyright 2026 DXOS.org
//

import {
  type UseHotkeysProps,
  useHotkeyRegistrations as useArkHotkeyRegistrations,
  useHotkeys as useArkHotkeys,
} from '@ark-ui/react';
import { type HotkeyStore } from '@zag-js/hotkeys';
import { useEffect } from 'react';

import { hotkeyStore, scopeChain } from './hotkey-store';

export * from './hotkey-store';

export { useHotkeyRecorder } from '@ark-ui/react';
export type { UseHotkeysCommand, UseHotkeysProps } from '@ark-ui/react';

/** Register commands for as long as the component is rendered, on the DXOS store by default. */
export const useHotkeys = ({ store = hotkeyStore, ...props }: UseHotkeysProps): void =>
  useArkHotkeys({ store, ...props });

/** Every registered command, whether or not its scope is active. */
export const useHotkeyRegistrations = (store: HotkeyStore = hotkeyStore) => useArkHotkeyRegistrations({ store });

/**
 * The commands that would fire right now: unscoped ones, plus those whose scope is active. This is
 * what a shortcuts list wants — the registry holds every binding in the app, most of them for
 * surfaces the user is not looking at.
 */
export const useActiveHotkeys = (store: HotkeyStore = hotkeyStore) => {
  const commands = useArkHotkeyRegistrations({ store });
  const active = new Set(store.getActiveScopes());
  return commands.filter(({ scopes }) => !scopes?.length || scopes.some((scope: string) => active.has(scope)));
};

/** Activate a scope path for as long as the component is mounted and `enabled`. */
export const useHotkeyScope = (path?: string, enabled = true, store: HotkeyStore = hotkeyStore): void => {
  useEffect(() => {
    if (!enabled || !path) {
      return;
    }

    const scopes = scopeChain(path);
    for (const scope of scopes) {
      store.addScope(scope);
    }

    return () => {
      for (const scope of scopes) {
        store.removeScope(scope);
      }
    };
  }, [store, path, enabled]);
};
