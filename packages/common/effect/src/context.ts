//
// Copyright 2025 DXOS.org
//

import { Effect, type Scope } from 'effect';

import { Context } from '@dxos/context';

// TODO(dmaretskyi): Error handling.
export const contextFromScope = (): Effect.Effect<Context, never, Scope.Scope> =>
  Effect.gen(function* () {
    const ctx = new Context();
    yield* Effect.addFinalizer(() => Effect.promise(() => ctx.dispose()));
    return ctx;
  });
