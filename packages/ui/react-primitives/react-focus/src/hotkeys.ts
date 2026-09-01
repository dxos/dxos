//
// Copyright 2026 DXOS.org
//

import { type CommandDefinition, type HotkeyCommand, type HotkeyStore, normalizeHotkey } from '@zag-js/hotkeys';
import { useCallback, useEffect, useId, useRef, useSyncExternalStore } from 'react';

import { hotkeyStore, scopeChain } from './hotkey-store';

export * from './hotkey-store';

export type UseHotkeysCommand = Omit<CommandDefinition, 'id'> & {
  /** Identifies the command across renders; generated when omitted. */
  id?: string;
};

export type UseHotkeysProps = {
  commands: UseHotkeysCommand[];
  /** Prefix for generated command ids. */
  id?: string;
  store?: HotkeyStore;
};

/**
 * Register commands for as long as the component is rendered.
 *
 * Written against `@zag-js/hotkeys` rather than `@ark-ui/react`'s equivalent hook: Ark has no
 * subpath export for it, so importing the hook pulls the barrel — and with it every component
 * machine in Zag — into whatever graph reaches this. These bindings are registered at startup, so
 * that graph is the EAGER boot graph, which is the thing this package exists to keep small.
 */
export const useHotkeys = ({ commands, id, store = hotkeyStore }: UseHotkeysProps): void => {
  const generatedId = useId();
  const instanceId = id ?? generatedId;

  // Read the latest commands from a ref so a new closure each render does not re-register.
  const commandsRef = useRef(commands);
  commandsRef.current = commands;

  const resolveId = (command: UseHotkeysCommand, index: number) => command.id ?? `${instanceId}:${index}`;
  // The registered shape, so a re-render with equivalent commands is a no-op.
  const signature = commands.map((command, index) => `${resolveId(command, index)}|${command.hotkey}`).join(',');

  useEffect(() => {
    // Ark's equivalent hook initialised the store as a side effect of resolving it; without that a
    // component registering before the app's own `initHotkeys` call would bind into a deaf store.
    if (!store.getState().listening) {
      store.init({ target: document });
    }

    const ids = commandsRef.current.map(resolveId);
    commandsRef.current.forEach((command, index) => {
      const commandId = ids[index];
      // Unregister first: the store warns on a duplicate id rather than replacing.
      store.unregister(commandId);
      store.register({
        ...command,
        id: commandId,
        hotkey: normalizeHotkey(command.hotkey),
        action: (event) => commandsRef.current[index]?.action(event),
        enabled: () => {
          const enabled = commandsRef.current[index]?.enabled;
          return typeof enabled === 'function' ? enabled() : (enabled ?? true);
        },
      });
    });

    return () => {
      for (const commandId of ids) {
        store.unregister(commandId);
      }
    };
  }, [store, signature]);
};

/** Every registered command, whether or not its scope is active. */
export const useHotkeyRegistrations = (store: HotkeyStore = hotkeyStore): HotkeyCommand[] => {
  // The store's subscribe is selector-based; select the command map's identity, which it replaces
  // on every register/unregister, so a snapshot comparison stays referentially stable between them.
  const subscribe = useCallback(
    (onChange: () => void) => store.subscribe((state) => state.commands, onChange),
    [store],
  );
  const snapshot = useCallback(() => store.getState().commands, [store]);
  const commands = useSyncExternalStore(subscribe, snapshot, snapshot);
  return Array.from(commands.values());
};

/**
 * The commands that would fire right now: unscoped ones, plus those whose scope is active. This is
 * what a shortcuts list wants — the registry holds every binding in the app, most of them for
 * surfaces the user is not looking at.
 */
export const useActiveHotkeys = (store: HotkeyStore = hotkeyStore): HotkeyCommand[] => {
  const commands = useHotkeyRegistrations(store);
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
