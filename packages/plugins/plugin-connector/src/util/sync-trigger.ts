//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { Capabilities, Capability } from '@dxos/app-framework';
import { ServiceResolver, Trigger, type TriggerEvent } from '@dxos/compute';
import { Database, Filter, type Key, type Obj, Query } from '@dxos/echo';
import { Cursor } from '@dxos/link';
import { connectedRoutinesQuery } from '@dxos/plugin-routine';

/**
 * Finds the sync timer trigger bound to `cursor`: a sync Routine's trigger carries the cursor as its
 * `input.binding`, so the reverse-ref from the cursor reaches it whether or not a Routine owns it.
 */
export const findSyncTriggerForBinding = (cursor: Cursor.ExternalCursor) =>
  Effect.gen(function* () {
    const triggers = yield* Database.query(Query.select(Filter.id(cursor.id)).referencedBy(Trigger.Trigger)).run;
    return triggers.find((trigger) => trigger.spec?.kind === 'timer');
  });

/**
 * Finds `target`'s sync timer trigger: the `timer` trigger owned by a Routine connected to `target`
 * (see {@link connectedRoutinesQuery}), falling back to a bare `timer` trigger bound to `target` via its
 * `binding` cursor (pre-existing triggers not wrapped in a routine). Mirrors the react-side lookup this
 * helper supersedes, so both agree on which trigger is "the" sync trigger.
 */
export const findSyncTrigger = (target: Obj.Unknown) =>
  Effect.gen(function* () {
    const routines = yield* Database.query(connectedRoutinesQuery(target)).run;
    for (const routine of routines) {
      const trigger = routine.triggers.find((ref) => ref.target?.spec?.kind === 'timer')?.target;
      if (trigger) {
        return trigger;
      }
    }

    const triggers = yield* Database.query(
      Query.select(Filter.id(target.id)).referencedBy(Cursor.Cursor).referencedBy(Trigger.Trigger),
    ).run;
    return triggers.find((trigger) => trigger.spec?.kind === 'timer');
  });

/**
 * The space's {@link Trigger.TriggerMonitorService}. The monitor has space affinity, so it is
 * resolved through the app's {@link Capabilities.ServiceResolver} rather than taken from the ambient
 * runtime — which also means it is absent outside the app (CLI, workerd), where callers fall back to
 * invoking the sync operation directly.
 */
export const syncTriggerMonitorLayer = (
  spaceId: Key.SpaceId,
): Layer.Layer<Trigger.TriggerMonitorService, Error, Capability.Service> =>
  Layer.unwrapEffect(
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
 * event a scheduled fire would have supplied.
 */
export const fireSyncTrigger = (trigger: Trigger.Trigger): Effect.Effect<void, never, Trigger.TriggerMonitorService> =>
  Effect.gen(function* () {
    const monitor = yield* Trigger.TriggerMonitorService;
    yield* monitor.invokeTrigger({ trigger, event: { tick: Date.now() } satisfies TriggerEvent.TimerEvent });
  });
