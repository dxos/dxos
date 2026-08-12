//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Operation from '@dxos/compute/Operation';
import { DXN, Ref, Type } from '@dxos/echo';
import { AccessToken, Connection } from '@dxos/link';

import { meta } from '#meta';

const makeKey = (name: string) => DXN.make(`${meta.profile.key}.operation.${name}`);

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
