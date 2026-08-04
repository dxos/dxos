//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

// Kept out of `TreeItem.tsx`: react-refresh only fast-refreshes a module whose exports are all
// components, so the schema and its guard exported beside them force a full page reload on every edit.

/** Drag-and-drop payload carried by every tree item. */
export const TreeDataSchema = Schema.Struct({
  id: Schema.String,
  path: Schema.Array(Schema.String),
  item: Schema.Any,
});

export type TreeData = Schema.Schema.Type<typeof TreeDataSchema>;

export const isTreeData = (data: unknown): data is TreeData => Schema.is(TreeDataSchema)(data);
