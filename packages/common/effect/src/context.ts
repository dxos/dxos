import { Context } from '@dxos/context';
import { Effect, type Scope } from 'effect';

// TODO(dmaretskyi): Error handling.
export const contextFromScope = (): Effect.Effect<Context, never, Scope.Scope> =>
  Effect.gen(function* () {
    const ctx = new Context();
    yield* Effect.addFinalizer(() => Effect.promise(() => ctx.dispose()));
    return ctx;
  });
