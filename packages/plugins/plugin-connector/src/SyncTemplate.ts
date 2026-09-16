//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';

import type * as CapabilityManager from '@dxos/app-framework/CapabilityManager';
import { Database, Filter, Obj } from '@dxos/echo';
import { Connection } from '@dxos/link';
import type * as RoutineCapabilities from '@dxos/plugin-routine/RoutineCapabilities';

import { ConnectorSpec } from '#types';

import * as Binding from './Binding.ts';
import { SyncTemplateScaffoldError } from './errors.ts';

/**
 * Id of the connector sync template. Declared here so the coordinator can seed the create-routine
 * dialog with it without importing the template module.
 */
export const ID = 'org.dxos.routine.connectorSync';

/**
 * "Sync" automation template: the account-level recurring sync routine for a Connection, built from
 * the connector-declared trigger spec and bound to the connector's own sync operation (whose handler
 * fans out over every binding of the account). Contributed so the routine is created through the
 * create-routine form — the user sees and can edit the schedule — instead of being persisted silently.
 *
 * The subject may be the Connection itself (the connection flow, the multi-target picker) or a bound
 * target such as a Mailbox (a target's sync affordance); a target resolves to its binding's
 * connection.
 */
export const make = (capabilities: CapabilityManager.CapabilityManager): RoutineCapabilities.Template => ({
  id: ID,
  label: 'Sync',
  icon: 'ph--arrows-clockwise--regular',
  hidden: true,
  scaffold: ({ name, subject }) =>
    Effect.gen(function* () {
      if (!subject) {
        return yield* Effect.fail(new SyncTemplateScaffoldError({ message: 'Sync template requires a subject.' }));
      }

      const connection = yield* resolveConnection(subject);
      if (!connection) {
        return yield* Effect.fail(new SyncTemplateScaffoldError({ message: 'Subject has no connection to sync.' }));
      }

      const connector = capabilities
        .getAll(ConnectorSpec.Connector)
        .flat()
        .find((entry) => entry.id === connection.connectorId);
      const sync = connector?.sync;
      if (!sync?.trigger) {
        return yield* Effect.fail(new SyncTemplateScaffoldError({ message: 'Connector declares no sync schedule.' }));
      }

      return Binding.scaffoldRoutine({
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
    const cursor = yield* Binding.queryCursor(subject);
    if (!cursor) {
      return undefined;
    }
    const connections = yield* Database.query(Filter.type(Connection.Connection)).run;
    return connections.find((connection) => Binding.isForConnection(cursor, connection));
  });
