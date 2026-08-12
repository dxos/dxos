//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { type CapabilityManager } from '@dxos/app-framework';
import { Database, Filter } from '@dxos/echo';
import { Connection } from '@dxos/link';
import type * as RoutineCapabilities from '@dxos/plugin-routine/RoutineCapabilities';

import * as ConnectorSpec from '../types/ConnectorSpec';
// Direct module imports, not the `../util` barrel: `util/sync-target` imports this file (to seed the
// recreation dialog), so going through the barrel would create a module cycle.
import { isCursorForConnection } from '../util/cursor-predicates';
import { findBindingForTarget } from '../util/find-binding';
import { scaffoldSyncRoutine } from '../util/sync-routine';
import { connectorIdsForTarget } from '../util/target-connectors';

/**
 * Id of the connector sync template. Declared here so the coordinator can seed the create-routine
 * dialog with it without importing the template module.
 */
export const SyncTemplateId = 'org.dxos.routine.connectorSync';

/**
 * "Sync" automation template: the recurring sync routine for an externally-bound object (a Mailbox,
 * a Calendar), built from the binding's connector-declared trigger spec and sync operation. Contributed
 * so the routine is created through the create-routine form — the user sees and can edit the schedule —
 * instead of being persisted silently by the connection flow.
 *
 * `appliesTo` can only check that a registered connector binds the subject's type; whether the subject
 * actually has a binding is verified in `scaffold` (a synchronous predicate cannot query for the cursor).
 */
export const makeSyncTemplate = (capabilities: CapabilityManager.CapabilityManager): RoutineCapabilities.Template => ({
  id: SyncTemplateId,
  label: 'Sync',
  icon: 'ph--arrows-clockwise--regular',
  appliesTo: (subject) => subject != null && connectorIdsForTarget(subject, capabilities).length > 0,
  scaffold: ({ name, subject }) =>
    Effect.gen(function* () {
      if (!subject) {
        return yield* Effect.fail(new Error('Sync template requires a subject.'));
      }
      const cursor = yield* findBindingForTarget(subject);
      if (!cursor) {
        return yield* Effect.fail(new Error('Subject has no external sync binding.'));
      }

      // The binding's connection carries the connector id; the connector declares the trigger spec
      // and sync operation the routine binds.
      const connections = yield* Database.query(Filter.type(Connection.Connection)).run;
      const connection = connections.find((connection) => isCursorForConnection(cursor, connection));
      const connector = capabilities
        .getAll(ConnectorSpec.Connector)
        .flat()
        .find((entry) => entry.id === connection?.connectorId);
      const sync = connector?.sync;
      if (!sync?.trigger) {
        return yield* Effect.fail(new Error('Connector declares no sync schedule.'));
      }

      return scaffoldSyncRoutine({ name, cursor, operation: sync.operation, spec: sync.trigger, remote: sync.remote });
    }),
});
