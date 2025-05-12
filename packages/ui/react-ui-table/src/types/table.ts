//
// Copyright 2024 DXOS.org
//

import { Schema } from 'effect';

import { Type } from '@dxos/echo';
// import { ThreadType } from '@dxos/plugin-space/types';
import { LabelAnnotationId } from '@dxos/echo-schema';
import { ViewType } from '@dxos/schema';

export const TableSchema = Schema.Struct({
  id: Type.ObjectId,
  name: Schema.optional(Schema.String),
  view: Schema.optional(Type.Ref(ViewType)),
  // TODO(burdon): Document why threads is included here?
  threads: Schema.optional(Schema.Array(Type.Ref(Type.Expando /* ThreadType */))),
}).annotations({
  // TODO(burdon): Move annotation to property.
  [LabelAnnotationId]: 'name',
});

export const TableType = TableSchema.pipe(
  Type.def({
    typename: 'dxos.org/type/Table',
    version: '0.1.0',
  }),
);
export interface TableType extends Schema.Schema.Type<typeof TableType> {}
