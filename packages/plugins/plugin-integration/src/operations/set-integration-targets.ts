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
 *
 * Diff key is `target.remoteId`. Existing entries with a matching `remoteId`
 * are preserved (cursor/status/object/options carry over); entries whose
 * `remoteId` isn't in the new selection are dropped. Auto-created entries
 * that have an `object` but no `remoteId` (e.g. Gmail's single Mailbox) are
 * always preserved — the dialog isn't responsible for them.
 */
const handler: Operation.WithHandler<typeof SetIntegrationTargets> = SetIntegrationTargets.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ integration, selected, existingTarget }) {
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

        const selectedById = new Map(selected.map((s) => [s.remoteId, s] as const));
        const currentRemoteIds = new Set(
          obj.targets.map((t) => t.remoteId).filter((id): id is string => id !== undefined),
        );

        // First newly-added target receives the `existingTarget` attachment.
        // Compute it up front so we can also backfill the local object's
        // `name` from the picker entry — same name a freshly-materialized
        // local object would have inherited.
        const firstNewSel = existingTarget ? selected.find((s) => !currentRemoteIds.has(s.remoteId)) : undefined;
        if (existingTarget && firstNewSel?.name) {
          const existing = (yield* Database.load(existingTarget)) as Obj.Unknown & { name?: string };
          if (!existing.name) {
            Obj.change(existing, (existing) => {
              (existing as { name?: string }).name = firstNewSel.name;
            });
          }
        }

        let added = 0;
        let removed = 0;

        Obj.change(obj, (obj) => {
          const mutable = obj as Obj.Mutable<typeof obj>;

          const next: (typeof obj.targets)[number][] = [];
          for (const target of obj.targets) {
            // Auto-created targets with no remoteId aren't touched by the
            // dialog (the user has no way to deselect them) — keep as-is.
            if (target.remoteId === undefined) {
              next.push({ ...target });
              continue;
            }
            if (selectedById.has(target.remoteId)) {
              next.push({ ...target });
            } else {
              removed++;
            }
          }
          // Subsequent picks materialize fresh placeholders lazily on first
          // sync, as usual.
          for (const sel of selected) {
            if (!currentRemoteIds.has(sel.remoteId)) {
              const attach = sel === firstNewSel && existingTarget !== undefined;
              next.push({
                remoteId: sel.remoteId,
                name: sel.name,
                ...(attach && { object: existingTarget }),
              });
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
