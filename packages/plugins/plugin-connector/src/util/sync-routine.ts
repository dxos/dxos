//
// Copyright 2026 DXOS.org
//

import * as Deferred from 'effect/Deferred';
import * as Effect from 'effect/Effect';
import * as FiberId from 'effect/FiberId';

import * as Operation from '@dxos/compute/Operation';
import * as Trigger from '@dxos/compute/Trigger';
import { Database, Obj, Ref } from '@dxos/echo';
import { Cursor } from '@dxos/link';
import { connectedRoutinesQuery, makeRoutine } from '@dxos/plugin-routine';

import { type ConnectorEntry, type SyncInput, type SyncOutput } from '../types';
import { findSyncTriggerForBinding } from './sync-trigger';

/**
 * Creates the sync Routine for `cursor`: a Routine wrapping a local (`remote` unset) trigger built
 * from the connector's declared `sync.trigger` spec, wired to the connector's sync operation with
 * `binding` bound to `cursor`. `input` carries only `binding`, matching the sync operation's input
 * schema — the routine is related to `target` by query ({@link connectedRoutinesQuery}, surfaced in the
 * routines companion), which reaches it through `binding` → the cursor → the cursor's `spec.target`,
 * so no target ref is smuggled into the operation input. Returns the existing trigger instead when a
 * sync routine is already connected to `target`.
 */
/**
 * Creation in flight, keyed by binding. The existence check below is an index query, so it cannot see
 * a Routine added moments earlier — without this, callers racing on one binding each observe none and
 * persist a schedule, syncing it twice a period. Process-local: a second peer racing needs the
 * one-routine-per-binding invariant at the data layer.
 */
const creating = new Map<string, Deferred.Deferred<Trigger.Trigger>>();

export const createSyncRoutine = ({
  target,
  cursor,
  operation,
  spec,
}: {
  target: Obj.Unknown;
  cursor: Cursor.ExternalCursor;
  operation: Operation.Definition<SyncInput, SyncOutput>;
  spec: Trigger.Spec;
}): Effect.Effect<Trigger.Trigger, never, Database.Service> =>
  // Claimed synchronously, before the first yield point, so no caller can interleave between the
  // lookup and the claim.
  Effect.suspend(() => {
    const inFlight = creating.get(cursor.id);
    if (inFlight) {
      return Deferred.await(inFlight);
    }

    const deferred = Deferred.unsafeMake<Trigger.Trigger>(FiberId.none);
    creating.set(cursor.id, deferred);
    return createRoutine({ target, cursor, operation, spec }).pipe(
      // Waiters see the same outcome, including a defect, rather than hanging on the deferred.
      Effect.onExit((exit) => Deferred.done(deferred, exit)),
      Effect.ensuring(Effect.sync(() => creating.delete(cursor.id))),
    );
  });

const createRoutine = ({
  target,
  cursor,
  operation,
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

    const trigger = Trigger.make({ enabled: true, spec, input: { binding: Ref.make(cursor) } });

    const routine = makeRoutine({
      name: 'Sync',
      // A connector's sync is statically defined and already in the registry, so the routine refers to
      // it by key rather than persisting a copy of it into the space.
      spec: { kind: 'runnable', runnable: Ref.fromURI(operation.meta.key) },
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
    // A binding whose target ref no longer resolves is broken beyond what routine setup can fix, and
    // a scheduled connector has no direct-sync path to fall back to.
    const target = yield* Database.load(cursor.spec.target).pipe(Effect.orDie);
    return yield* createSyncRoutine({ target, cursor, operation: sync.operation, spec: sync.trigger });
  });
