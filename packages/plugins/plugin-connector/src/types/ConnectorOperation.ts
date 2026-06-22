//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Operation } from '@dxos/compute';
import { Ref, Type, DXN } from '@dxos/echo';
import { AccessToken } from '@dxos/types';

import { meta } from '#meta';

import * as Connection from './Connection';

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
    accessToken: Ref.Ref(AccessToken.AccessToken).annotations({
      description: 'The access token this Connection uses to authenticate to its service.',
    }),
    name: Schema.String.annotations({
      description: 'Optional user-friendly label.',
    }).pipe(Schema.optional),
  }),
  output: Type.getSchema(Connection.Connection),
});
