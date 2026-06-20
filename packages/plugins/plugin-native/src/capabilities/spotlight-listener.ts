//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { LayoutOperation } from '@dxos/app-toolkit';
import { log } from '@dxos/log';

import { NativeCapabilities } from '#types';

// TODO(wittjosiah): Formalize with a stricter schema if we evolve this protocol.
type SpotlightInvokePayload = {
  operation: string;
  payload?: Record<string, any>;
};

const DEFAULT_SHORTCUT = 'Alt+Space';

/**
 * Listens for spotlight:invoke events from the popover window and dispatches the corresponding operation.
 * Also watches the settings atom and applies any user-configured global shortcut at runtime.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const { invokePromise } = yield* Capability.get(Capabilities.OperationInvoker);
    const registry = yield* Capability.get(Capabilities.AtomRegistry);
    const settingsAtom = yield* Capability.get(NativeCapabilities.Settings);

    // Apply the saved shortcut on startup, then watch for changes.
    // Tracks what shortcut Tauri currently has registered so we can unregister it before registering the new one.
    let activeShortcut = DEFAULT_SHORTCUT;

    const unsubSettings = registry.subscribe(
      settingsAtom,
      async (settings) => {
        const desired = settings.spotlightShortcut ?? DEFAULT_SHORTCUT;
        if (desired === activeShortcut) {
          return;
        }
        try {
          const { invoke } = await import('@tauri-apps/api/core');
          await invoke('update_spotlight_shortcut', { old_shortcut: activeShortcut, new_shortcut: desired });
          activeShortcut = desired;
        } catch (err) {
          log.catch(err);
        }
      },
      { immediate: true },
    );

    const unlisten = yield* Effect.promise(async () => {
      const { listen } = await import('@tauri-apps/api/event');
      const { getCurrentWindow } = await import('@tauri-apps/api/window');

      return listen<SpotlightInvokePayload>('spotlight:invoke', async (event) => {
        const { operation, payload } = event.payload;
        log.info('Received spotlight invoke event', { operation, payload });
        try {
          switch (operation) {
            case 'open':
              await invokePromise(LayoutOperation.Open, payload as any);
              break;
            case 'switch-workspace':
              await invokePromise(LayoutOperation.SwitchWorkspace, payload as any);
              break;
            default:
              log.warn('Unknown spotlight operation', { operation });
          }

          const mainWindow = getCurrentWindow();
          await mainWindow.show();
          await mainWindow.setFocus();
        } catch (err) {
          log.catch(err);
        }
      });
    });

    return Capability.contributes(Capabilities.Null, null, () =>
      Effect.sync(() => {
        unsubSettings();
        unlisten();
      }),
    );
  }),
);
