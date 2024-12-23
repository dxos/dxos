//
// Copyright 2024 DXOS.org
//

import { Ref, ObjectId, S, TypedObject } from '@dxos/echo-schema';
import { ThreadType } from '@dxos/plugin-space';
import { ViewType } from '@dxos/schema';

export const TableSchema = S.Struct({
  id: ObjectId, // TODO(burdon): Where should this be?
  name: S.optional(S.String),
  view: S.optional(Ref(ViewType)),
  // TODO(burdon): Should not import from plugin. Either factor out type or use reverse deps when supported.
  threads: S.optional(S.Array(Ref(ThreadType))),
});

// type TableType = S.Schema.Type<typeof TableSchema>;

export class TableType extends TypedObject({
  typename: 'dxos.org/type/Table',
  version: '0.1.0',
})(TableSchema.fields) {}
