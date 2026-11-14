//
// Copyright 2026 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';

import * as Capability from '@dxos/app-framework/Capability';
import { Database } from '@dxos/echo';
import { log } from '@dxos/log';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import { type Space } from '@dxos/react-client/echo';

// The module alone: it loads when the space list appears, before any spec opens.
import { foldFeatures } from '../fold/fold-features.ts';

/** Folds one space's features once it is ready; a failed pass is logged and tried again next session. */
const foldSpace = (space: Space) =>
  Effect.promise(() => space.waitUntilReady()).pipe(
    Effect.andThen(foldFeatures().pipe(Effect.provide(Database.layer(space.db)))),
    Effect.tap((result) =>
      Effect.sync(() =>
        result.specs > 0
          ? log.info('features folded into specs', { space: space.id, ...result })
          : log.verbose('no features to fold', { space: space.id }),
      ),
    ),
    Effect.asVoid,
    Effect.catchCause((cause) =>
      Effect.sync(() => {
        Cause.hasInterruptsOnly(cause) ||
          log.warn('feature fold failed', { space: space.id, error: Cause.pretty(cause) });
      }),
    ),
  );

/** Folds every space's feature objects into its specs' text when the space loads, once per space per session. */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const client = yield* ClientCapabilities.Client;
    const started = new Map<string, Fiber.Fiber<void>>();
    const fold = (spaces: readonly Space[]) => {
      for (const space of spaces) {
        if (!started.has(space.id)) {
          started.set(space.id, Effect.runFork(foldSpace(space)));
        }
      }
    };
    fold(client.spaces.get());
    const subscription = client.spaces.subscribe(fold);
    yield* Effect.addFinalizer(() =>
      Effect.sync(() => subscription.unsubscribe()).pipe(Effect.andThen(Fiber.interruptAll(started.values()))),
    );
    return [];
  }),
);
