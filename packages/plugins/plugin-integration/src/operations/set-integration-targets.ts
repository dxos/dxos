//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database, Obj } from '@dxos/echo';
import { Operation } from '@dxos/operation';

import { type Integration } from '../types';
import { SetIntegrationTargets } from './definitions';

/**
 * Generic, service-agnostic selection diff. See definitions.ts.
 */
const handler: Operation.WithHandler<typeof SetIntegrationTargets> = SetIntegrationTargets.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ integration, selectedRefs }) {
      // TODO(wittjosiah): the operation should just depend on `Database.Service`
      //   and have it provided by the OperationInvoker — composer's invoker is
      //   wired without a `databaseResolver`, so we derive the db from the input
      //   ref's target and provide `Database.layer(db)` ourselves.
      const target = integration.target;
      const db = target ? Obj.getDatabase(target) : undefined;
      if (!db) {
        return yield* Effect.fail(new Error('No database for integration ref'));
      }

      return yield* Effect.gen(function* () {
        const obj = (yield* Database.load(integration)) as Integration.Integration;
        const selectedIds = new Set(selectedRefs.map((ref) => ref.dxn.toString()));
        const currentByDxn = new Map(obj.targets.map((t) => [t.object.dxn.toString(), t]));

        let added = 0;
        let removed = 0;

        Obj.change(obj, (mutableObj) => {
          const mutable = mutableObj as Obj.Mutable<typeof mutableObj>;

          // Build the new targets array: keep currently-selected entries (preserving
          // their cursor/status), drop entries whose ref isn't in the new selection,
          // and append fresh entries for newly-selected refs.
          const next: Array<{ object: typeof selectedRefs[number]; cursor?: string; lastSyncAt?: string; lastError?: string }> = [];
          for (const target of obj.targets) {
            if (selectedIds.has(target.object.dxn.toString())) {
              next.push({ ...target });
            } else {
              removed++;
            }
          }
          for (const ref of selectedRefs) {
            if (!currentByDxn.has(ref.dxn.toString())) {
              next.push({ object: ref });
              added++;
            }
          }

          mutable.targets = next;
        });

        return { added, removed };
      }).pipe(Effect.provide(Database.layer(db)));
    }),
  ),
);

export default handler;
