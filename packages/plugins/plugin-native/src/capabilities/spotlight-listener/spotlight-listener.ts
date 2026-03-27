//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { LayoutOperation } from '@dxos/app-toolkit';
import { log } from '@dxos/log';

type SpotlightInvokePayload = {
  operation: string;
  payload?: Record<string, any>;
};

/**
 * Listens for spotlight:invoke events from the popover window and dispatches the corresponding operation.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const { invokeSync } = yield* Capability.get(Capabilities.OperationInvoker);

    const unlisten = yield* Effect.promise(async () => {
      const { listen } = await import('@tauri-apps/api/event');
      const { getCurrentWindow } = await import('@tauri-apps/api/window');

      return listen<SpotlightInvokePayload>('spotlight:invoke', async (event) => {
        const { operation, payload } = event.payload;
        log.info('Received spotlight invoke event', { operation, payload });
        try {
          switch (operation) {
            case 'open':
              invokeSync(LayoutOperation.Open, payload as any);
              break;
            case 'switch-workspace':
              invokeSync(LayoutOperation.SwitchWorkspace, payload as any);
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
        unlisten();
      }),
    );
  }),
);
