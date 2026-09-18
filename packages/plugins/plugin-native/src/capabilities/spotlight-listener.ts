//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { log } from '@dxos/log';

// The payload is the operation's input, decoded against its schema on arrival.
type SpotlightInvokePayload = {
  operation: string;
  payload?: unknown;
};

/**
 * Listens for spotlight:invoke events from the popover window and dispatches the corresponding operation.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const { invokePromise } = yield* Capabilities.OperationInvoker;

    const unlisten = yield* Effect.promise(async () => {
      const { listen } = await import('@tauri-apps/api/event');
      const { getCurrentWindow } = await import('@tauri-apps/api/window');

      return listen<SpotlightInvokePayload>('spotlight:invoke', async (event) => {
        const { operation, payload } = event.payload;
        log.info('Received spotlight invoke event', { operation, payload });
        try {
          switch (operation) {
            case 'open':
              await invokePromise(LayoutOperation.Open, Schema.decodeUnknownSync(LayoutOperation.Open.input)(payload));
              break;
            case 'switch-workspace':
              await invokePromise(
                LayoutOperation.SwitchWorkspace,
                Schema.decodeUnknownSync(LayoutOperation.SwitchWorkspace.input)(payload),
              );
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

    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        unlisten();
      }),
    );
    return [];
  }),
);
