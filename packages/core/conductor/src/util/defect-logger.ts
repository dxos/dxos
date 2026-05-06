//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { log } from '@dxos/log';

/**
 * Logs effect failures without altering the typed error channel.
 */
export const createDefectLogger = <A, E, R>(): ((self: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>) =>
  Effect.tapError((error: E) =>
    Effect.sync(() => {
      log.error('unhandled effect error', { error });
    }),
  );
