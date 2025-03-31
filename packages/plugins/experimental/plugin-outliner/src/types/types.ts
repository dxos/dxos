//
// Copyright 2024 DXOS.org
//

import { EchoObject, S } from '@dxos/echo-schema';

// TODO(burdon): Reconcile with @dxos/graph (i.e., common types).
// TODO(burdon): Use consistent -Schema + -Type pattern (throughout) and replace extends TypedObejct.
// TODO(burdon): Allow Nodes to reference other Trees.

//
// Tree
//

export const TreeNodeSchema = S.Struct({
  children: S.mutable(S.Array(S.suspend(() => TreeNodeType))),
  text: S.String,
  done: S.optional(S.Boolean),
}).pipe(EchoObject('dxos.org/type/TreeNode', '0.1.0'));

// NOTE: Has to be an interface to avoid TS circular dependency error.
export interface TreeNodeType extends S.Schema.Type<typeof TreeNodeSchema> {}

export const TreeNodeType: S.Schema<TreeNodeType> = TreeNodeSchema;

export const TreeType = S.Struct({
  name: S.optional(S.String),
  root: TreeNodeType,
}).pipe(EchoObject('dxos.org/type/Tree', '0.1.0'));

export interface TreeType extends S.Schema.Type<typeof TreeType> {}

//
// Journal
//

export const JournalEntryType = S.Struct({
  date: S.Date,
  root: TreeNodeType,
}).pipe(EchoObject('dxos.org/type/JournalEntry', '0.1.0'));

export interface JournalEntryType extends S.Schema.Type<typeof JournalEntryType> {}

export const JournalType = S.Struct({
  name: S.optional(S.String),
  entries: S.mutable(S.Array(JournalEntryType)),
}).pipe(EchoObject('dxos.org/type/Journal', '0.1.0'));

export interface JournalType extends S.Schema.Type<typeof JournalType> {}
