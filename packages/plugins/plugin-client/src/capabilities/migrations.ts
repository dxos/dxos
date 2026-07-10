//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { log } from '@dxos/log';

import { ClientCapabilities } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const registry = yield* Capability.get(Capabilities.AtomRegistry);
    const client = yield* Capability.get(ClientCapabilities.Client);
    const migrationsAtom = yield* Capability.atom(ClientCapabilities.Migration);

    // NOTE: Migrations are currently unidirectional and idempotent.
    const cancel = registry.subscribe(
      migrationsAtom,
      (_migrations: any[]) => {
        const migrations = Array.from(new Set(_migrations.flat()));
        const spaces = client.spaces.get();
        // Fire-and-forget: migrations are idempotent and re-run on the next subscription firing.
        // A rejection (e.g. services torn down mid-run) must be handled here or it escapes as an
        // unhandled rejection from this floating promise.
        void Promise.all(spaces.map((space: any) => space.internal.db.runMigrations(migrations))).catch((err) => {
          log.warn('space migrations failed', { err });
        });
      },
      { immediate: true },
    );

    return Capability.contributes(Capabilities.Null, null, () => Effect.sync(() => cancel()));
  }),
);
