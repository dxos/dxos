//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { type Migration } from '@dxos/echo';
import { log } from '@dxos/log';
import { RpcClosedError } from '@dxos/protocols';

import { ClientCapabilities } from '#types';

import { type SpaceMigrationWatcher, watchSpaceMigrations } from './space-migrations.ts';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const registry = yield* Capabilities.AtomRegistry;
    const client = yield* ClientCapabilities.Client;
    const migrationContributions = yield* ClientCapabilities.Migration;

    // Read by every space's listener, so a late write folds against the current migration set.
    let migrations: Migration.Migration[] = [];
    let watcher: SpaceMigrationWatcher | undefined;

    // NOTE: Migrations are currently unidirectional and idempotent.
    const cancel = registry.subscribe(
      migrationContributions.atom,
      (_migrations: any[]) => {
        migrations = Array.from(new Set(_migrations.flat()));
        if (watcher) {
          watcher.rerun();
          return;
        }
        // The activation wave can land while the client is mid-teardown (or not yet through its
        // forked initialization); spaces are unreadable then and there is nothing to migrate.
        if (!client.initialized) {
          return;
        }
        // Migrations run fire-and-forget; an in-flight flush can be interrupted when the client shuts
        // down, which surfaces as a benign RpcClosedError race.
        watcher = watchSpaceMigrations(
          client.spaces,
          () => migrations,
          (err) => {
            if (!(err instanceof RpcClosedError)) {
              log.catch(err);
            }
          },
        );
      },
      { immediate: true },
    );

    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        cancel();
        watcher?.close();
      }),
    );
    return [];
  }),
);
