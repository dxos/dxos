//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { LayoutOperation } from '@dxos/app-toolkit';
import { SubscriptionList } from '@dxos/async';
import { log } from '@dxos/log';

import { NativeCapabilities, Settings } from '#types';

// TODO(wittjosiah): Formalize with a stricter schema if we evolve this protocol.
type SpotlightInvokePayload = {
  operation: string;
  payload?: Record<string, any>;
};

/**
 * Listens for spotlight:invoke events from the popover window and dispatches the corresponding operation.
 * Also propagates the configured global shortcut to the Tauri backend whenever it changes.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const { invokePromise } = yield* Capability.get(Capabilities.OperationInvoker);
    const registry = yield* Capability.get(Capabilities.AtomRegistry);
    const settingsAtom = yield* Capability.get(NativeCapabilities.Settings);

    const subscriptions = new SubscriptionList();

    const { listen, emit } = yield* Effect.promise(() => import('@tauri-apps/api/event'));
    const { getCurrentWindow } = yield* Effect.promise(() => import('@tauri-apps/api/window'));

    // Forward the configured shortcut to the Tauri backend whenever it changes.
    let lastShortcut: string | undefined;
    const syncShortcut = () => {
      const next = registry.get(settingsAtom).spotlightShortcut ?? Settings.DEFAULT_SPOTLIGHT_SHORTCUT;
      if (next === lastShortcut) {
        return;
      }
      lastShortcut = next;
      emit('spotlight:update-shortcut', { shortcut: next }).catch((err) => log.catch(err));
    };
    syncShortcut();
    subscriptions.add(registry.subscribe(settingsAtom, syncShortcut));

    const unlisten = yield* Effect.promise(() =>
      listen<SpotlightInvokePayload>('spotlight:invoke', async (event) => {
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
      }),
    );
    subscriptions.add(() => unlisten());

    return Capability.contributes(Capabilities.Null, null, () =>
      Effect.sync(() => {
        subscriptions.clear();
      }),
    );
  }),
);
