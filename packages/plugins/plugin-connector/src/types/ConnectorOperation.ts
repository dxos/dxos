//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { DXN, Ref, Type } from '@dxos/echo';
import { AccessToken } from '@dxos/link';

import { meta } from '#meta';

import * as Connection from './Connection';

const makeKey = (name: string) => DXN.make(`${meta.profile.key}.operation.${name}`);

/**
 * Runs {@link ConnectorEntry.sync} for every external-sync cursor authenticated by a Connection.
 * Centralises the fan-out so the graph-builder action and the React hook share
 * the same code path. `Capability.Service` is declared as a service so the
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
