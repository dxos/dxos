//
// Copyright 2024 DXOS.org
//

import { ref, S, TypedObject } from '@dxos/echo-schema';
import { ThreadType } from '@dxos/plugin-space';
import { ViewType } from '@dxos/schema';

export const TableSchema = S.Struct({
  id: S.String,
  name: S.optional(S.String),
  view: S.optional(ref(ViewType)),
  threads: S.optional(S.Array(ref(ThreadType))),
});

export class TableType extends TypedObject({
  typename: 'dxos.org/type/Table',
  version: '0.1.0',
})(TableSchema.fields) {}
