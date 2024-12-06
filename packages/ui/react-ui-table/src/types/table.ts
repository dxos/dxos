//
// Copyright 2024 DXOS.org
//

import { ref, ObjectId, S, TypedObject } from '@dxos/echo-schema';
import { ThreadType } from '@dxos/plugin-space';
import { ViewType } from '@dxos/schema';

export const TableSchema = S.Struct({
  id: ObjectId, // TODO(burdon): Where should this be?
  name: S.optional(S.String),
  view: S.optional(ref(ViewType)),
  // TODO(burdon): Should not import from plugin. Either factor out type or use reverse deps when supported.
  threads: S.optional(S.Array(ref(ThreadType))),
});

// type TableType = S.Schema.Type<typeof TableSchema>;

export class TableType extends TypedObject({
  typename: 'dxos.org/type/Table',
  version: '0.1.0',
})(TableSchema.fields) {}

// const task = {};

// A
// { project: ref(Project); }
// task.project.name => proxy
// ref(task, 'project') => ref

// B
// { project: ref(Project); }
// ref(task.project).name => proxy
// task.project.target.name => proxy
// task.project.$ref?.name => proxy
// task.$project.name => proxy

// await task.project.$ref.name => proxy

// const name = await ref(task.project).name = 'foo';

// task.project => ref                    // Impossible? E.g., can't distinguish undefined.

// query DSL?
// toJSON?
