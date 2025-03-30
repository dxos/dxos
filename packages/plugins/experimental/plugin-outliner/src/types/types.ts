//
// Copyright 2024 DXOS.org
//

import { EchoObject, Ref, S, type Ref$ } from '@dxos/echo-schema';

// TODO(burdon): Reconcile with Task. Convert from TypedObject to Schema.
// TODO(burdon): Change -Type suffix to -Schema?

export const TreeNodeType = S.Struct({
  // TODO(burdon): Refs vs. objects?
  children: S.suspend((): S.mutable<S.Array$<Ref$<TreeNodeType>>> => S.mutable(S.Array(Ref(TreeNodeType)))),

  text: S.String,

  // TODO(burdon): Support mixin.
  done: S.optional(S.Boolean),
}).pipe(EchoObject('dxos.org/type/TreeNode', '0.1.0'));

// NOTE: Has to be an interface to avoid TS circular dependency error.
export interface TreeNodeType extends S.Schema.Type<typeof TreeNodeType> {}

export const TreeType = S.Struct({
  name: S.optional(S.String),
  root: Ref(TreeNodeType), // TOOD(burdon): Remove Ref.
}).pipe(EchoObject('dxos.org/type/Tree', '0.1.0'));

export type TreeType = S.Schema.Type<typeof TreeType>;

export const JournalEntryType = S.Struct({
  date: S.Date,
  // TODO(dmaretskyi): Has to be a ref if its referencing ECHO objects.
  root: TreeNodeType,
}).pipe(EchoObject('dxos.org/type/JournalEntry', '0.1.0'));

export type JournalEntryType = S.Schema.Type<typeof JournalEntryType>;

export const JournalType = S.Struct({
  name: S.optional(S.String),

  // TODO(burdon): Refs vs. objects?
  // TODO(dmaretskyi): Has to be a ref if its referencing ECHO objects.
  entries: S.mutable(S.Array(JournalEntryType)),
}).pipe(EchoObject('dxos.org/type/Journal', '0.1.0'));

export type JournalType = S.Schema.Type<typeof JournalType>;
