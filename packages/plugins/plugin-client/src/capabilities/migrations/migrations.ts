//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common } from '@dxos/app-framework';

import { ClientCapabilities } from '../../types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const registry = yield* Capability.get(Common.Capability.AtomRegistry);
    const client = yield* Capability.get(ClientCapabilities.Client);
    const migrationsAtom = yield* Capability.atom(ClientCapabilities.Migration);

    // NOTE: Migrations are currently unidirectional and idempotent.
    const cancel = registry.subscribe(
      migrationsAtom,
      (_migrations: any[]) => {
        const migrations = Array.from(new Set(_migrations.flat()));
        const spaces = client.spaces.get();
        void Promise.all(spaces.map((space: any) => space.internal.db.runMigrations(migrations)));
      },
      { immediate: true },
    );

    return Capability.contributes(Common.Capability.Null, null, () => Effect.sync(() => cancel()));
  }),
);
