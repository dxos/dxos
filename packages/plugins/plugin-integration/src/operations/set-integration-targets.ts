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

        // Compare refs by echo id, not by full DXN string. Stored target refs
        // are serialised in space-relative form (`dxn:echo:@:...`) by ECHO,
        // while the `selectedRefs` coming from the checklist UI may be
        // absolute (`dxn:echo:<spaceId>:...`). A naive string compare would
        // treat the same object as two different refs and silently re-add /
        // remove every target on every submit, losing cursor/lastSyncAt.
        const refEchoId = (ref: typeof selectedRefs[number]): string | undefined =>
          ref.dxn.asEchoDXN()?.echoId;
        const targetEchoId = (target: typeof obj.targets[number]): string | undefined =>
          target.object.dxn.asEchoDXN()?.echoId;

        const selectedIds = new Set(
          selectedRefs.map(refEchoId).filter((id): id is string => id !== undefined),
        );
        const currentIds = new Set(
          obj.targets.map(targetEchoId).filter((id): id is string => id !== undefined),
        );

        let added = 0;
        let removed = 0;

        Obj.change(obj, (mutableObj) => {
          const mutable = mutableObj as Obj.Mutable<typeof mutableObj>;

          // Build the new targets array: keep currently-selected entries (preserving
          // their cursor/status), drop entries whose ref isn't in the new selection,
          // and append fresh entries for newly-selected refs.
          const next: Array<{ object: typeof selectedRefs[number]; cursor?: string; lastSyncAt?: string; lastError?: string }> = [];
          for (const target of obj.targets) {
            const id = targetEchoId(target);
            if (id !== undefined && selectedIds.has(id)) {
              next.push({ ...target });
            } else {
              removed++;
            }
          }
          for (const ref of selectedRefs) {
            const id = refEchoId(ref);
            if (id !== undefined && !currentIds.has(id)) {
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
