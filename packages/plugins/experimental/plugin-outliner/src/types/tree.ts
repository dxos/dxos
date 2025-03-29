//
// Copyright 2024 DXOS.org
//

import { Ref, S, TypedObject, type Ref$ } from '@dxos/echo-schema';

// TODO(burdon): Reconcile with Task. Convert from TypedObject to Schema.

export class TreeNodeType extends TypedObject({ typename: 'dxos.org/type/TreeNode', version: '0.1.0' })({
  children: S.suspend((): S.mutable<S.Array$<Ref$<TreeNodeType>>> => S.mutable(S.Array(Ref(TreeNodeType)))),
  text: S.String,

  // TODO(burdon): Support mixin.
  done: S.optional(S.Boolean),
}) {}

export class TreeType extends TypedObject({ typename: 'dxos.org/type/Tree', version: '0.1.0' })({
  name: S.optional(S.String),
  root: Ref(TreeNodeType),
  checkbox: S.optional(S.Boolean),
}) {}
