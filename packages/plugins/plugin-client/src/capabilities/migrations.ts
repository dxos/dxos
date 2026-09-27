//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { type CleanupFn } from '@dxos/async';
import { type Migration } from '@dxos/echo';
import { log } from '@dxos/log';
import { RpcClosedError } from '@dxos/protocols';

import { ClientCapabilities } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const registry = yield* Capabilities.AtomRegistry;
    const client = yield* ClientCapabilities.Client;
    const migrationContributions = yield* ClientCapabilities.Migration;

    // Read by every space's listener, so a late write folds against the current migration set.
    let migrations: Migration.Migration[] = [];
    // `runMigrations` folds forward at the end of its run; these catch late writes replicated after it.
    const foldForwardCleanups = new Map<string, CleanupFn>();

    // NOTE: Migrations are currently unidirectional and idempotent.
    const cancel = registry.subscribe(
      migrationContributions.atom,
      (_migrations: any[]) => {
        // The activation wave can land while the client is mid-teardown (or not yet through its
        // forked initialization); spaces are unreadable then and there is nothing to migrate.
        if (!client.initialized) {
          return;
        }
        migrations = Array.from(new Set(_migrations.flat()));
        const spaces = client.spaces.get();
        // Migrations run fire-and-forget from the subscription callback; an in-flight flush can be
        // interrupted when the client shuts down, which surfaces as a benign RpcClosedError race.
        void Promise.all(spaces.map((space) => space.internal.db.runMigrations(migrations))).catch((err) => {
          if (!(err instanceof RpcClosedError)) {
            log.catch(err);
          }
        });

        spaces.forEach((space) => {
          const db = space.internal.db;
          if (!foldForwardCleanups.has(db.spaceId)) {
            foldForwardCleanups.set(
              db.spaceId,
              db.watchFoldForward(() => migrations),
            );
          }
        });
      },
      { immediate: true },
    );

    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        cancel();
        for (const cleanup of foldForwardCleanups.values()) {
          cleanup();
        }
      }),
    );
    return [];
  }),
);
