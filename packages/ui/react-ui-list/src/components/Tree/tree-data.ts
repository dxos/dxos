//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

// Kept out of `TreeItem.tsx`: react-refresh only fast-refreshes a module whose exports are all
// components, so the schema and its guard exported beside them force a full page reload on every edit.

/** Drag-and-drop payload carried by every tree item. */
export const TreeDataSchema = Schema.Struct({
  /** The `Tree` this row belongs to, so a monitor can tell its own drags from another tree's. */
  treeId: Schema.String,
  id: Schema.String,
  path: Schema.Array(Schema.String),
  item: Schema.Any,
});

export type TreeData = Schema.Schema.Type<typeof TreeDataSchema>;

export const isTreeData = (data: unknown): data is TreeData => Schema.is(TreeDataSchema)(data);

/**
 * Whether the payload is a tree item belonging to `treeId`.
 *
 * pragmatic-dnd monitors are global, so every mounted tree sees every other tree's drags. Matching
 * on shape alone is not enough — the payloads are identical — and a monitor that claims a foreign
 * drag goes on to read its `item` as its own node type.
 */
export const isTreeDataFor = (data: unknown, treeId: string): data is TreeData =>
  isTreeData(data) && data.treeId === treeId;
