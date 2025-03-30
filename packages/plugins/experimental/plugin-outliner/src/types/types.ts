//
// Copyright 2024 DXOS.org
//

import { Ref, S, TypedObject, type Ref$ } from '@dxos/echo-schema';

// TODO(burdon): Reconcile with Task. Convert from TypedObject to Schema.
// TODO(burdon): Change -Type suffix to -Schema?

export class TreeNodeType extends TypedObject({ typename: 'dxos.org/type/TreeNode', version: '0.1.0' })({
  // TODO(burdon): Refs vs. objects?
  children: S.suspend((): S.mutable<S.Array$<Ref$<TreeNodeType>>> => S.mutable(S.Array(Ref(TreeNodeType)))),

  text: S.String,

  // TODO(burdon): Support mixin.
  done: S.optional(S.Boolean),
}) {}

export class TreeType extends TypedObject({ typename: 'dxos.org/type/Tree', version: '0.1.0' })({
  name: S.optional(S.String),
  root: Ref(TreeNodeType),
}) {}

// export const JournalEntryType = S.Struct({
//   date: S.Date,
//   root: TreeNodeType,
// }).pipe(EchoObject('dxos.org/type/JournalEntry', '0.1.0'));

// export type JournalEntryType = S.Schema<typeof JournalEntryType>;

// export const JournalType = S.Struct({
//   name: S.optional(S.String),
//   entries: S.mutable(S.Array(JournalEntryType)),
// }).pipe(EchoObject('dxos.org/type/Journal', '0.1.0'));

// export type JournalType = S.Schema<typeof JournalType>;

export class JournalEntryType extends TypedObject({ typename: 'dxos.org/type/JournalEntry', version: '0.1.0' })({
  date: S.Date,
  root: Ref(TreeNodeType),
}) {}

export class JournalType extends TypedObject({ typename: 'dxos.org/type/JournalType', version: '0.1.0' })({
  name: S.optional(S.String),

  // TODO(burdon): Refs vs. objects?
  entries: S.suspend((): S.mutable<S.Array$<Ref$<JournalEntryType>>> => S.mutable(S.Array(Ref(JournalEntryType)))),
}) {}
