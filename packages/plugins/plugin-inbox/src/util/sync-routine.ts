//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation, Trigger } from '@dxos/compute';
import { Database, Filter, Obj, Ref } from '@dxos/echo';
import { Cursor } from '@dxos/link';
import { type SyncInput, type SyncOutput } from '@dxos/plugin-connector';
import { Routine, connectedRoutinesQuery } from '@dxos/plugin-routine';

/** How often an auto-created sync routine's timer trigger fires. */
const SYNC_ROUTINE_CRON = '*/10 * * * *';

/**
 * Finds an existing local record for `definition`, or persists a fresh one via
 * {@link Operation.serialize}. Entirely local — `definition` is the connector's already-registered
 * in-code operation (e.g. `InboxOperation.GoogleMailSync`), the same one `ConnectorOperation.SyncConnection`
 * invokes directly; nothing is fetched from or deployed to Edge.
 */
const ensureOperationRecord = (
  definition: Operation.Definition<SyncInput, SyncOutput>,
): Effect.Effect<Operation.PersistentOperation, never, Database.Service> =>
  Effect.gen(function* () {
    const existing = yield* Database.query(
      Filter.and(Filter.type(Operation.PersistentOperation), Filter.key(definition.meta.key)),
    ).run;
    return existing[0] ?? (yield* Database.add(Operation.serialize(definition)));
  });

/**
 * Ensures a recurring sync {@link Routine} exists for `target` (a Mailbox or Calendar) and returns its
 * timer trigger — the existing one if a routine is already connected, otherwise a freshly-created one:
 * a local (`remote` unset) timer trigger, every 10 minutes, wired to `sync` — the connector's own sync
 * operation, the same one `ConnectorOperation.SyncConnection` invokes directly — with `binding` bound
 * to `cursor` (the target's external-sync {@link Cursor}). `input` carries only `binding`, matching the
 * sync operation's input schema. The routine is related to `target` by query ({@link connectedRoutinesQuery},
 * surfaced in the routines companion), which reaches it through `binding` → the cursor → the cursor's
 * `spec.target` — so no target ref is smuggled into the operation input.
 */
export const createSyncRoutine = ({
  target,
  cursor,
  sync,
}: {
  target: Obj.Unknown;
  cursor: Cursor.ExternalCursor;
  sync: Operation.Definition<SyncInput, SyncOutput>;
}): Effect.Effect<Trigger.Trigger | undefined, never, Database.Service> =>
  Effect.gen(function* () {
    const connected = yield* Database.query(connectedRoutinesQuery(target)).run;
    for (const routine of connected) {
      const existingTrigger = routine.triggers.find((ref) => ref.target?.spec?.kind === 'timer')?.target;
      if (existingTrigger) {
        return existingTrigger;
      }
    }

    const operation = yield* ensureOperationRecord(sync);
    const trigger = Trigger.make({
      enabled: true,
      spec: Trigger.specTimer(SYNC_ROUTINE_CRON),
      input: { binding: Ref.make(cursor) },
    });

    const routine = Routine.make({
      name: 'Sync',
      spec: { kind: 'runnable', runnable: Ref.make(operation) },
      trigger,
    });

    yield* Database.add(routine);
    return trigger;
  });
