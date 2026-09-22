//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import { log } from '@dxos/log';
// UI-free subpath: the root barrel reaches the panel components, which would pull React into the
// headless barrels this module is carried into.
import { logBuffer } from '@dxos/react-ui-debug/log-buffer';

/**
 * Start recording into the process-wide log buffer at startup, so the log companion shows what
 * happened before it was opened. Recording deliberately does not follow the panel's mount: the
 * entries worth reading are usually the ones from before you went looking.
 *
 * Uncaught errors and unhandled rejections bypass the log pipeline, so they are forwarded into it
 * here: the buffer, and the snapshot operation reading it, are then the one record of what went
 * wrong in the page.
 */
export default Capability.makeModule(
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
