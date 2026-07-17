//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { Capabilities, Capability } from '@dxos/app-framework';
import { ServiceResolver, Trigger, type TriggerEvent } from '@dxos/compute';
import { Database, Filter, Obj, Query } from '@dxos/echo';
import { Cursor } from '@dxos/link';
import { Connection, Connector } from '@dxos/plugin-connector';
import { connectedRoutinesQuery } from '@dxos/plugin-routine';

import { findBindingForTarget } from './find-binding';
import { createSyncRoutine } from './sync-routine';

/**
 * Finds `target`'s sync timer trigger: the `timer` trigger owned by a Routine connected to `target`
 * (see {@link connectedRoutinesQuery}), falling back to a bare `timer` trigger bound to `target` via its
 * `binding` cursor (pre-existing triggers not wrapped in a routine). Mirrors the react-side lookup this
 * helper supersedes, so both agree on which trigger is "the" sync trigger.
 */
const findSyncTrigger = (target: Obj.Unknown) =>
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
 * Force-runs the sync timer trigger for a Mailbox or Calendar — invoking the trigger is how a
 * target syncs; this is a thin helper around {@link Trigger.TriggerMonitorService}, not a domain
 * action in its own right, so it's a plain Effect rather than a registered {@link Operation}.
 * Creates a sync Routine first via {@link createSyncRoutine} if the target has none yet (e.g. it
 * was bound before this mechanism existed).
 */
export const syncTarget = (target: Obj.Unknown) =>
  Effect.gen(function* () {
    const db = Obj.getDatabase(target);
    if (!db) {
      return;
    }

    const trigger = yield* Effect.gen(function* () {
      const existing = yield* findSyncTrigger(target);
      if (existing) {
        return existing;
      }

      const cursor = yield* findBindingForTarget(target);
      if (!cursor) {
        return undefined;
      }

      const [connection] = yield* Database.query(
        Filter.type(Connection.Connection, { accessToken: cursor.spec.source }),
      ).run;
      const connectors = (yield* Capability.getAll(Connector)).flat();
      const connector = connectors.find((entry) => entry.id === connection?.connectorId);
      if (!connector?.sync) {
        return undefined;
      }

      return yield* createSyncRoutine({ target, cursor, sync: connector.sync });
    }).pipe(Effect.provide(Database.layer(db)));
    if (!trigger) {
      return;
    }

    const resolver = yield* Capability.get(Capabilities.ServiceResolver);
    const triggerMonitorLayer = ServiceResolver.provide({ space: db.spaceId }, Trigger.TriggerMonitorService).pipe(
      Layer.provide(Layer.succeed(ServiceResolver.ServiceResolver, resolver)),
    );
    yield* Effect.gen(function* () {
      const monitor = yield* Trigger.TriggerMonitorService;
      yield* monitor.invokeTrigger({ trigger, event: { tick: Date.now() } satisfies TriggerEvent.TimerEvent });
    }).pipe(Effect.provide(triggerMonitorLayer));
  });
