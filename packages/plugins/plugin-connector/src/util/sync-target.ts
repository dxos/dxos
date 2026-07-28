//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { type Trigger } from '@dxos/compute';
import { Database, Filter, Obj } from '@dxos/echo';

import { Connection, Connector } from '../types';
import { findBindingForTarget } from './find-binding';
import { createSyncRoutine } from './sync-routine';
import { findSyncTrigger, fireSyncTrigger, syncTriggerMonitorLayer } from './sync-trigger';

/**
 * Force-runs the sync timer trigger for a sync target (a Mailbox, Calendar, …) — invoking the trigger
 * is how a target syncs; this is a thin helper around {@link Trigger.TriggerMonitorService}, not a
 * domain action in its own right, so it's a plain Effect rather than a registered Operation.
 * Creates a sync Routine first via {@link createSyncRoutine} if the target has none yet (e.g. it was
 * bound before this mechanism existed).
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

    yield* fireSyncTrigger(trigger).pipe(Effect.provide(syncTriggerMonitorLayer(db.spaceId)));
  });
