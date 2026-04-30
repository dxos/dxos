//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { log } from '@dxos/log';

export const createDefectLogger = <A, E, R>(): ((self: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>) =>
  Effect.catchAll((error) =>
    Effect.gen(function* () {
      log.error('unhandled effect error', { error });
      throw error;
    }),
  );
