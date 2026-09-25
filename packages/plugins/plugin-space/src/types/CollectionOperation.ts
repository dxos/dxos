//
// Copyright 2023 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Operation from '@dxos/compute/Operation';
import { Collection, DXN, Type } from '@dxos/echo';

export const Create = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.space.createCollection'),
    name: 'Create Collection',
    icon: 'ph--folder--regular',
  },
  input: Schema.Struct({
    name: Schema.optional(Schema.String),
  }),
  output: Schema.Struct({
    object: Type.getSchema(Collection.Collection),
  }),
});
