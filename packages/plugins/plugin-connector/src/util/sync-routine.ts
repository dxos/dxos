//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation, Trigger } from '@dxos/compute';
import { Database, Filter, Obj, Ref } from '@dxos/echo';
import { Cursor } from '@dxos/link';
import { connectedRoutinesQuery, makeRoutine } from '@dxos/plugin-routine';

import { type ConnectorEntry, type SyncInput, type SyncOutput } from '../types';
import { findSyncTriggerForBinding } from './sync-trigger';

/**
 * Finds an existing local record for `definition`, or persists a fresh one via
 * {@link Operation.serialize}. Entirely local — `definition` is the connector's already-registered
 * in-code operation (e.g. `InboxOperation.GoogleMailSync`); nothing is fetched from or deployed to
 * Edge.
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
 * Creates the sync Routine for `cursor`: a Routine wrapping a local (`remote` unset) trigger built
 * from the connector's declared `sync.trigger` spec, wired to the connector's sync operation with
 * `binding` bound to `cursor`. `input` carries only `binding`, matching the sync operation's input
 * schema — the routine is related to `target` by query ({@link connectedRoutinesQuery}, surfaced in the
 * routines companion), which reaches it through `binding` → the cursor → the cursor's `spec.target`,
 * so no target ref is smuggled into the operation input. Returns the existing trigger instead when a
 * sync routine is already connected to `target`.
 */
export const createSyncRoutine = ({
  target,
  cursor,
  operation: definition,
  spec,
}: {
  target: Obj.Unknown;
  cursor: Cursor.ExternalCursor;
  operation: Operation.Definition<SyncInput, SyncOutput>;
  spec: Trigger.Spec;
}): Effect.Effect<Trigger.Trigger, never, Database.Service> =>
  Effect.gen(function* () {
    const connected = yield* Database.query(connectedRoutinesQuery(target)).run;
    for (const routine of connected) {
      const existingTrigger = routine.triggers.find((ref) => ref.target?.spec?.kind === spec.kind)?.target;
      if (existingTrigger) {
        return existingTrigger;
      }
    }

    const operation = yield* ensureOperationRecord(definition);
    const trigger = Trigger.make({ enabled: true, spec, input: { binding: Ref.make(cursor) } });

    const routine = makeRoutine({
      name: 'Sync',
      spec: { kind: 'runnable', runnable: Ref.make(operation) },
      trigger,
    });

    yield* Database.add(routine);
    return trigger;
  });

/**
 * The trigger of `cursor`'s sync Routine, creating the Routine when the binding has none yet.
 * `undefined` when the connector declares no `sync.trigger` — such a connector syncs on demand only,
 * so its sync operation is invoked directly instead of through a trigger.
 */
export const ensureSyncTrigger = ({
  connector,
  cursor,
}: {
  connector: ConnectorEntry;
  cursor: Cursor.ExternalCursor;
}): Effect.Effect<Trigger.Trigger | undefined, never, Database.Service> =>
  Effect.gen(function* () {
    const sync = connector.sync;
    if (!sync?.trigger) {
      return undefined;
    }
    const existing = yield* findSyncTriggerForBinding(cursor);
    if (existing) {
      return existing;
    }
    // A binding whose target ref no longer resolves is broken beyond what routine setup can fix;
    // callers treat this whole step as best-effort and fall back to a direct sync.
    const target = yield* Database.load(cursor.spec.target).pipe(Effect.orDie);
    return yield* createSyncRoutine({ target, cursor, operation: sync.operation, spec: sync.trigger });
  });
