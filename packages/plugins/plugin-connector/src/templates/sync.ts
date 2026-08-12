//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { type CapabilityManager } from '@dxos/app-framework';
import { Database, Filter, Obj } from '@dxos/echo';
import { Connection } from '@dxos/link';
import type * as RoutineCapabilities from '@dxos/plugin-routine/RoutineCapabilities';

import * as ConnectorSpec from '../types/ConnectorSpec';
// Direct module imports, not the `../util` barrel: `util/sync-target` imports this file (to seed the
// recreation dialog), so going through the barrel would create a module cycle.
import { isCursorForConnection } from '../util/cursor-predicates';
import { findBindingForTarget } from '../util/find-binding';
import { scaffoldConnectionSyncRoutine } from '../util/sync-routine';
import { connectorIdsForTarget } from '../util/target-connectors';

/**
 * Id of the connector sync template. Declared here so the coordinator can seed the create-routine
 * dialog with it without importing the template module.
 */
export const SyncTemplateId = 'org.dxos.routine.connectorSync';

/**
 * "Sync" automation template: the account-level recurring sync routine for a Connection, built from
 * the connector-declared trigger spec and bound to the connector's own sync operation (whose handler
 * fans out over every binding of the account). Contributed so the routine is created through the
 * create-routine form — the user sees and can edit the schedule — instead of being persisted silently.
 *
 * The subject may be the Connection itself (the connection flow, the multi-target picker) or a bound
 * target such as a Mailbox (a target's sync affordance); a target resolves to its binding's
 * connection. `appliesTo` can only check the subject's shape; the binding/connector lookups happen
 * in `scaffold` (a synchronous predicate cannot query).
 */
export const makeSyncTemplate = (capabilities: CapabilityManager.CapabilityManager): RoutineCapabilities.Template => ({
  id: SyncTemplateId,
  label: 'Sync',
  icon: 'ph--arrows-clockwise--regular',
  appliesTo: (subject) =>
    subject != null &&
    (Obj.instanceOf(Connection.Connection, subject) || connectorIdsForTarget(subject, capabilities).length > 0),
  scaffold: ({ name, subject }) =>
    Effect.gen(function* () {
      if (!subject) {
        return yield* Effect.fail(new Error('Sync template requires a subject.'));
      }

      const connection = yield* resolveConnection(subject);
      if (!connection) {
        return yield* Effect.fail(new Error('Subject has no connection to sync.'));
      }

      const connector = capabilities
        .getAll(ConnectorSpec.Connector)
        .flat()
        .find((entry) => entry.id === connection.connectorId);
      const sync = connector?.sync;
      if (!sync?.trigger) {
        return yield* Effect.fail(new Error('Connector declares no sync schedule.'));
      }

      return scaffoldConnectionSyncRoutine({
        name,
        connection,
        operation: sync.operation,
        spec: sync.trigger,
        remote: sync.remote,
      });
    }),
});

/** The subject's connection: the subject itself, or the connection its binding authenticates with. */
const resolveConnection = (subject: Obj.Unknown) =>
  Effect.gen(function* () {
    if (Obj.instanceOf(Connection.Connection, subject)) {
      return subject;
    }
    const cursor = yield* findBindingForTarget(subject);
    if (!cursor) {
      return undefined;
    }
    const connections = yield* Database.query(Filter.type(Connection.Connection)).run;
    return connections.find((connection) => isCursorForConnection(cursor, connection));
  });
