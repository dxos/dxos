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
  // TODO(burdon): Should not import from plugin. Either factor out type or use reverse deps when supported.
  threads: S.optional(S.Array(ref(ThreadType))),
});

// type TableType = S.ClassType<typeof TableSchema>;

// TODO(burdon): UX should not depend on ECHO types.
export class TableType extends TypedObject({
  typename: 'dxos.org/type/Table',
  version: '0.1.0',
})(TableSchema.fields) {}
