//
// Copyright 2024 DXOS.org
//

import { Schema } from 'effect';

// import { ThreadType } from '@dxos/plugin-space/types';
import { Type } from '@dxos/echo';
import { ObjectId, Ref, Expando, LabelAnnotation } from '@dxos/echo-schema';
import { DataType } from '@dxos/schema';

export const TableSchema = Schema.Struct({
  id: ObjectId,
  name: Schema.optional(Schema.String),
  view: Schema.optional(Ref(DataType.Projection)),
  // TODO(burdon): Document why threads is included here?
  threads: Schema.optional(Schema.Array(Ref(Expando /* ThreadType */))),
}).pipe(LabelAnnotation.set(['name']));

// TODO(burdon): Move out of react-ui-xxx.
export const TableType = TableSchema.pipe(
  Type.Obj({
    typename: 'dxos.org/type/Table',
    version: '0.1.0',
  }),
);
export interface TableType extends Schema.Schema.Type<typeof TableType> {}
