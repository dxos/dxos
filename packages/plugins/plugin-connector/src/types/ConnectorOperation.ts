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
 * Syncs every external-sync cursor authenticated by a Connection. Centralises the fan-out so the
 * graph-builder action and the React hook share the same code path. A cursor whose sync Routine
 * exists is synced by force-running that Routine's trigger, so the run is driven by the trigger
 * dispatcher exactly as a scheduled fire would be; a cursor with no Routine falls back to invoking
 * {@link ConnectorEntry.sync} directly. `Capability.Service` is declared as a service so the handler
 * can resolve the connector entry and the trigger monitor at invocation time.
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
  }),
  output: Schema.Struct({
    synced: Schema.Number,
  }),
  services: [Capability.Service],
});

/**
 * Deletes a Connection, leaving its sync bindings dormant: their cursors survive (the synced range and
 * merge state describe the remote account, not the credential, and a later re-connect of the same
 * account resumes from them) with their sync Routines disabled so nothing fires without a credential.
 * The single delete path for both the nav-tree action and the connection settings panel — when they had
 * one each, they disagreed about the cursors.
 */
export const DeleteConnection = Operation.make({
  meta: {
    key: makeKey('deleteConnection'),
    name: 'Delete Connection',
    description: 'Deletes a Connection and suspends its sync bindings.',
    icon: 'ph--trash--regular',
  },
  input: Schema.Struct({
    connection: Ref.Ref(Connection.Connection),
  }),
  output: Schema.Struct({
    suspended: Schema.Number.annotate({ description: 'Bindings left dormant by the deletion.' }),
  }),
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
    accessToken: Ref.Ref(AccessToken.AccessToken).annotate({
      description: 'The access token this Connection uses to authenticate to its service.',
    }),
    name: Schema.String.annotate({
      description: 'Optional user-friendly label.',
    }).pipe(Schema.optional),
  }),
  output: Type.getSchema(Connection.Connection),
});
