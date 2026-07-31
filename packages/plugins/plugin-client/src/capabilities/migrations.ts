//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { log } from '@dxos/log';
import { RpcClosedError } from '@dxos/protocols';

import { ClientCapabilities } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const registry = yield* Capabilities.AtomRegistry;
    const client = yield* ClientCapabilities.Client;
    const migrationContributions = yield* ClientCapabilities.Migration;

    // NOTE: Migrations are currently unidirectional and idempotent.
    const cancel = registry.subscribe(
      migrationContributions.atom,
      (_migrations: any[]) => {
        const migrations = Array.from(new Set(_migrations.flat()));
        const spaces = client.spaces.get();
        // Migrations run fire-and-forget from the subscription callback; an in-flight flush can be
        // interrupted when the client shuts down, which surfaces as a benign RpcClosedError race.
        void Promise.all(spaces.map((space: any) => space.internal.db.runMigrations(migrations))).catch((err) => {
          if (!(err instanceof RpcClosedError)) {
            log.catch(err);
          }
        });
      },
      { immediate: true },
    );

    yield* Effect.addFinalizer(() => Effect.sync(() => cancel()));
    return [];
  }),
);
