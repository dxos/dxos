//
// Copyright 2023 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Operation from '@dxos/compute/Operation';
import { Collection, DXN, Type } from '@dxos/echo';

const COLLECTION_OPERATION = 'org.dxos.plugin.collection.operation';

export const Create = Operation.make({
  meta: { key: DXN.make(`${COLLECTION_OPERATION}.create`), name: 'Create Collection', icon: 'ph--folder--regular' },
  input: Schema.Struct({
    name: Schema.optional(Schema.String),
  }),
  output: Schema.Struct({
    object: Type.getSchema(Collection.Collection),
  }),
});
