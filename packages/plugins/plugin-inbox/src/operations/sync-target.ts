//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Operation, Trigger, type TriggerEvent } from '@dxos/compute';
import { Database, Filter, Obj, Query } from '@dxos/echo';
import { Connection, Connector } from '@dxos/plugin-connector';
import { connectedRoutinesQuery } from '@dxos/plugin-routine';

import { InboxOperation } from '../types';
import { createSyncRoutine, findBindingForTarget } from '../util';

/**
 * Finds `target`'s sync timer trigger: the `timer` trigger owned by a Routine connected to `target`
 * (see {@link connectedRoutinesQuery}), falling back to a bare `timer` trigger whose `input` refs
 * `target` directly (pre-existing triggers not wrapped in a routine). Mirrors the react-side
 * lookup this operation supersedes, so both agree on which trigger is "the" sync trigger.
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

    const targetUri = Obj.getURI(target);
    const allTriggers = yield* Database.query(Query.select(Filter.type(Trigger.Trigger))).run;
    return allTriggers.find((trigger) => {
      if (trigger.spec?.kind !== 'timer') {
        return false;
      }
      const ref = trigger.input?.mailbox ?? trigger.input?.calendar;
      return ref?.uri === targetUri;
    });
  });

export default InboxOperation.SyncTarget.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ target }) {
      const db = Obj.getDatabase(target);
      if (!db) {
        return;
      }

      let trigger = yield* findSyncTrigger(target).pipe(Effect.provide(Database.layer(db)));
      if (!trigger) {
        const cursor = yield* findBindingForTarget(target).pipe(Effect.provide(Database.layer(db)));
        if (!cursor) {
          return;
        }

        const connections = yield* Database.query(Filter.type(Connection.Connection)).run.pipe(
          Effect.provide(Database.layer(db)),
        );
        const connection = connections.find((candidate) => candidate.accessToken.uri === cursor.spec.source.uri);
        const connectors = (yield* Capability.Service).getAll(Connector).flat();
        const connector = connectors.find((entry) => entry.id === connection?.connectorId);
        if (!connector?.sync) {
          return;
        }

        trigger = yield* createSyncRoutine({ target, cursor, sync: connector.sync }).pipe(
          Effect.provide(Database.layer(db)),
        );
        if (!trigger) {
          return;
        }
      }

      const monitor = yield* Trigger.TriggerMonitorService;
      yield* monitor.invokeTrigger({ trigger, event: { tick: Date.now() } satisfies TriggerEvent.TimerEvent });
    }),
  ),
  Operation.opaqueHandler,
);
