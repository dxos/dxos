//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import type * as Routine from '@dxos/compute/Routine';
import * as ServiceResolver from '@dxos/compute/ServiceResolver';
import * as Trigger from '@dxos/compute/Trigger';
import type * as TriggerEvent from '@dxos/compute/TriggerEvent';
import { Database, Filter, type Key, Obj, Query } from '@dxos/echo';
import { type Connection, type Cursor } from '@dxos/link';

/**
 * Finds the (legacy, per-binding) sync trigger bound to `cursor`: an older sync Routine's trigger
 * carries the cursor as its `input.binding`, so the reverse-ref from the cursor reaches it whether
 * or not a Routine owns it. New sync routines are connection-level — see
 * {@link findSyncTriggerForConnection}.
 */
export const findSyncTriggerForBinding = (cursor: Cursor.ExternalCursor) =>
  Effect.gen(function* () {
    const triggers = yield* Database.query(Query.select(Filter.id(cursor.id)).referencedBy(Trigger.Trigger)).run;
    return triggers.find((trigger) => !!trigger.spec);
  });

/**
 * Finds the sync trigger of `connection`'s sync Routine: the trigger carries the connection as its
 * `input.connection`, so the reverse-ref from the connection reaches it whether or not a Routine
 * owns it.
 */
export const findSyncTriggerForConnection = (connection: Connection.Connection) =>
  Effect.gen(function* () {
    const triggers = yield* Database.query(Query.select(Filter.id(connection.id)).referencedBy(Trigger.Trigger)).run;
    return triggers.find((trigger) => !!trigger.spec);
  });

/**
 * The sync trigger a Routine owns, read straight off its `triggers` array.
 *
 * Unlike {@link findSyncTriggerForConnection} this needs no query, so it sees a routine the caller
 * just persisted — the reverse-ref index lags a write, and a lookup that races it reports the routine
 * as missing.
 */
export const syncTriggerOfRoutine = (routine: Routine.Routine): Trigger.Trigger | undefined =>
  routine.triggers
    .map((ref) => ref.target)
    .find((trigger): trigger is Trigger.Trigger => Obj.instanceOf(Trigger.Trigger, trigger) && !!trigger.spec);

/**
 * The space's {@link Trigger.TriggerMonitorService}. The monitor has space affinity, so it is
 * resolved through the app's {@link Capabilities.ServiceResolver} rather than taken from the ambient
 * runtime; resolution fails where no such capability exists (CLI, workerd), which is why this layer
 * carries an error channel.
 */
export const syncTriggerMonitorLayer = (
  spaceId: Key.SpaceId,
): Layer.Layer<Trigger.TriggerMonitorService, Error, Capability.Service> =>
  Layer.unwrap(
    Capability.get(Capabilities.ServiceResolver).pipe(
      Effect.map((resolver) =>
        ServiceResolver.provide({ space: spaceId }, Trigger.TriggerMonitorService).pipe(
          Layer.provide(Layer.succeed(ServiceResolver.ServiceResolver, resolver)),
        ),
      ),
    ),
  );

/**
 * Force-runs a sync trigger through the monitor, which routes a `remote` trigger to EDGE and a local
 * one to the trigger dispatcher — the dispatcher being what carries the run's durable execution, so
 * a batched sync continues past its first capped run. The synthetic tick stands in for the timer
 * event a scheduled fire would have supplied. `data` (e.g. the pressed binding for pressed-first
 * ordering) rides on a {@link TriggerEvent.DirectEvent} so the trigger's input templates
 * (`{{event.data.*}}`) can pick it up; the dispatcher keeps the event across `runAgain` retries, so
 * the hint survives continuation rounds.
 */
export const fireSyncTrigger = (
  trigger: Trigger.Trigger,
  data?: Record<string, any>,
): Effect.Effect<void, never, Trigger.TriggerMonitorService> =>
  Effect.gen(function* () {
    const monitor = yield* Trigger.TriggerMonitorService;
    const event = data
      ? ({ data } satisfies TriggerEvent.DirectEvent)
      : ({ tick: Date.now() } satisfies TriggerEvent.TimerEvent);
    yield* monitor.invokeTrigger({ trigger, event });
  });
