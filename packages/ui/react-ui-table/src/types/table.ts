//
// Copyright 2024 DXOS.org
//

import { EchoObject, Expando, LabelAnnotationId, ObjectId, Ref, S } from '@dxos/echo-schema';
// import { ThreadType } from '@dxos/plugin-space/types';
import { ViewType } from '@dxos/schema';

export const TableSchema = S.Struct({
  id: ObjectId,
  name: S.optional(S.String),
  view: S.optional(Ref(ViewType)),
  // TODO(burdon): Document why threads is included here?
  threads: S.optional(S.Array(Ref(Expando /* ThreadType */))),
}).annotations({
  // TODO(burdon): Move annotation to property.
  [LabelAnnotationId]: 'name',
});

export const TableType = TableSchema.pipe(EchoObject({ typename: 'dxos.org/type/Table', version: '0.1.0' }));
export interface TableType extends S.Schema.Type<typeof TableType> {}
