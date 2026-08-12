//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import { DXN, Ref, Type } from '@dxos/echo';
import { AccessToken, Connection } from '@dxos/link';

import { meta } from '#meta';

const makeKey = (name: string) => DXN.make(`${meta.profile.key}.operation.${name}`);

/**
 * Syncs every external-sync cursor authenticated by a Connection: the runnable of the connection's
 * sync Routine, and the shared fan-out for the graph-builder action and the React hook. Each
 * binding's sync operation is invoked directly; when any binding requests continuation
 * (`Operation.runAgain`, a capped run with work left) the whole operation re-raises it after
 * attempting every binding, so a dispatcher-driven run resumes — the durable per-binding cursors
 * make the re-run pick up where it left off. `Capability.Service` is declared as a service so the
 * handler can resolve the connector entry at invocation time.
 */
export const SyncConnection = Operation.make({
  meta: {
    key: makeKey('syncConnection'),
    name: 'Sync Connection',
    description: 'Runs the sync operation for all sync bindings of a connection.',
    icon: 'ph--arrows-clockwise--regular',
  },
  input: Schema.Struct({
    connection: Ref.Ref(Connection.Connection),
    /**
     * Id of the cursor to sync first (pressed-first ordering): a manual sync from one target's
     * button carries its binding here via the trigger-event template, so the pressed target grabs
     * a fan-out slot immediately while its siblings queue. Scheduled fires leave it unset.
     */
    priority: Schema.optional(Schema.String),
  }),
  output: Schema.Struct({
    synced: Schema.Number,
  }),
  services: [Capability.Service],
});

/**
 * Generic create operation: produces a Connection bound to the given AccessToken.
 */
export const CreateConnection = Operation.make({
  meta: {
    key: makeKey('createConnection'),
    name: 'Create Connection',
    description: 'Creates a new Connection bound to an existing AccessToken.',
    icon: 'ph--plugs-connected--regular',
  },
  input: Schema.Struct({
    accessToken: Ref.Ref(AccessToken.AccessToken).annotations({
      description: 'The access token this Connection uses to authenticate to its service.',
    }),
    name: Schema.String.annotations({
      description: 'Optional user-friendly label.',
    }).pipe(Schema.optional),
  }),
  output: Type.getSchema(Connection.Connection),
});
