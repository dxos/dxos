//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import type * as Scope from 'effect/Scope';

import { Context } from '@dxos/context';

// TODO(dmaretskyi): Error handling.
export const contextFromScope = (): Effect.Effect<Context, never, Scope.Scope> =>
  Effect.gen(function* () {
    const ctx = new Context();
    yield* Effect.addFinalizer(() => Effect.promise(() => ctx.dispose()));
    return ctx;
  });
