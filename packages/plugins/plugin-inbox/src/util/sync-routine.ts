//
// Copyright 2026 DXOS.org
//

import { Operation, Trigger } from '@dxos/compute';
import { type Database, Filter, Obj, Ref, Type } from '@dxos/echo';
import { Cursor } from '@dxos/link';
import { type SyncInput, type SyncOutput } from '@dxos/plugin-connector';
import { Routine, connectedRoutinesQuery } from '@dxos/plugin-routine';

import { Calendar } from '#types';

/** How often an auto-created sync routine's timer trigger fires. */
const SYNC_ROUTINE_CRON = '*/10 * * * *';

/**
 * Finds an existing local record for `definition`, or persists a fresh one via
 * {@link Operation.serialize}. Entirely local — `definition` is the connector's already-registered
 * in-code operation (e.g. `InboxOperation.GoogleMailSync`), the same one `ConnectorOperation.SyncConnection`
 * invokes directly; nothing is fetched from or deployed to Edge.
 */
const ensureOperationRecord = async (
  db: Database.Database,
  definition: Operation.Definition<SyncInput, SyncOutput>,
): Promise<Operation.PersistentOperation> => {
  const existing = await db
    .query(Filter.and(Filter.type(Operation.PersistentOperation), Filter.key(definition.meta.key)))
    .run();
  return existing[0] ?? db.add(Operation.serialize(definition));
};

/**
 * Creates a recurring sync {@link Routine} for `target` (a Mailbox or Calendar): a local (`remote`
 * unset) timer trigger, every 10 minutes, wired to `sync` — the connector's own sync operation, the
 * same one `ConnectorOperation.SyncConnection`/the toolbar's fallback path invoke directly — with
 * `binding` bound to `cursor` (the target's external-sync {@link Cursor}). The routine is related to
 * `target` by query ({@link connectedRoutinesQuery}, surfaced in the routines companion) rather than
 * by an ownership field on `target`; the trigger's `input` also carries a `mailbox`/`calendar` ref
 * purely so that query can find it. No-op if a routine with a `timer` trigger is already connected.
 */
export const createSyncRoutine = async ({
  db,
  target,
  cursor,
  sync,
}: {
  db: Database.Database;
  target: Obj.Unknown;
  cursor: Cursor.ExternalCursor;
  sync: Operation.Definition<SyncInput, SyncOutput>;
}): Promise<void> => {
  const connected = await db.query(connectedRoutinesQuery(target)).run();
  const hasSyncTrigger = connected.some((routine) =>
    routine.triggers.some((ref) => ref.target?.spec?.kind === 'timer'),
  );
  if (hasSyncTrigger) {
    return;
  }

  const operation = await ensureOperationRecord(db, sync);
  const inputKey = Obj.getTypename(target) === Type.getTypename(Calendar.Calendar) ? 'calendar' : 'mailbox';
  const trigger = Trigger.make({
    enabled: true,
    spec: Trigger.specTimer(SYNC_ROUTINE_CRON),
    input: { binding: Ref.make(cursor), [inputKey]: db.makeRef(Obj.getURI(target)) },
  });

  const routine = Routine.make({
    name: 'Sync',
    spec: { kind: 'runnable', runnable: Ref.make(operation) },
    trigger,
  });

  db.add(routine);
};
