//
// Copyright 2024 DXOS.org
//

import { EchoObject, Expando, LabelAnnotationId, ObjectId, Ref, S } from '@dxos/echo-schema';
// import { ThreadType } from '@dxos/plugin-space/types';
import { ViewType } from '@dxos/schema';

export const TableSchema = S.Struct({
  id: ObjectId, // TODO(burdon): Where should this be?
  name: S.optional(S.String),
  view: S.optional(Ref(ViewType)),
  // TODO(burdon): Should not import from plugin. Either factor out type or use reverse deps when supported.
  threads: S.optional(S.Array(Ref(Expando /* ThreadType */))), // TODO(dmaretskyi): Breaks edge because plugin-space depends on react-client.
}).annotations({
  [LabelAnnotationId]: 'name',
});

export const TableType = TableSchema.pipe(EchoObject('dxos.org/type/Table', '0.1.0'));
export type TableType = S.Schema.Type<typeof TableType>;
