//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import { log } from '@dxos/log';
// UI-free subpath: the root barrel reaches the panel components, which would pull React into the
// headless barrels this module is carried into.
import { logBuffer } from '@dxos/react-ui-debug/log-buffer';

import { DebugEvents } from '#types';

export const LogRecording = Capability.makeModule(
  'LogRecording',
  { provides: [], activatesOn: DebugEvents.Start },
  Effect.fnUntraced(function* () {
    logBuffer.start();
    const onError = (event: ErrorEvent) => log.error('uncaught error', { error: event.error ?? event.message });
    const onRejection = (event: PromiseRejectionEvent) => log.error('unhandled rejection', { error: event.reason });
    if (typeof window !== 'undefined') {
      window.addEventListener('error', onError);
      window.addEventListener('unhandledrejection', onRejection);
    }
    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        if (typeof window !== 'undefined') {
          window.removeEventListener('error', onError);
          window.removeEventListener('unhandledrejection', onRejection);
        }
        logBuffer.stop();
      }),
    );
    return [];
  }),
);
