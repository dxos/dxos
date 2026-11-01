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

// The module alone, not the model barrel: it loads when the space list appears, before any drawing opens.
import { migrateLegacyDrawings } from '../model/legacy-migration.ts';

/** Migrates one space's legacy drawings once it is ready; a failed pass is logged and tried again next session. */
const migrateSpace = (space: Space) =>
  Effect.promise(() => space.waitUntilReady()).pipe(
    Effect.andThen(migrateLegacyDrawings().pipe(Effect.provide(Database.layer(space.db)))),
    Effect.tap((result) =>
      Effect.sync(() =>
        Object.values(result).some((count) => count > 0)
          ? log.info('legacy drawings migrated', { space: space.id, ...result })
          : log.verbose('no legacy drawings', { space: space.id }),
      ),
    ),
    Effect.asVoid,
    Effect.catchCause((cause) =>
      Effect.sync(() => {
        Cause.hasInterruptsOnly(cause) || log.warn('legacy drawing migration failed', { space: space.id, cause });
      }),
    ),
  );

/**
 * Moves every space's legacy scene drawings onto `Canvas`es when the space loads (plugin-canvas D-17), once per space
 * per session; the pass is idempotent, so a space another peer already migrated costs one query.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const client = yield* ClientCapabilities.Client;
    const started = new Map<string, Fiber.Fiber<void>>();
    const migrate = (spaces: readonly Space[]) => {
      for (const space of spaces) {
        if (!started.has(space.id)) {
          started.set(space.id, Effect.runFork(migrateSpace(space)));
        }
      }
    };
    migrate(client.spaces.get());
    const subscription = client.spaces.subscribe(migrate);
    yield* Effect.addFinalizer(() =>
      Effect.sync(() => subscription.unsubscribe()).pipe(Effect.andThen(Fiber.interruptAll(started.values()))),
    );
    return [];
  }),
);
