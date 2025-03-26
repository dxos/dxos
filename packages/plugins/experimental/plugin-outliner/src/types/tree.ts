//
// Copyright 2024 DXOS.org
//

import { Ref, S, TypedObject, type Ref$ } from '@dxos/echo-schema';

// TODO(burdon): Reconcile with Task.

export class TreeItemType extends TypedObject({ typename: 'dxos.org/type/TreeItem', version: '0.1.0' })({
  text: S.String, // TODO(burdon): Rename text?
  items: S.optional(S.suspend((): S.mutable<S.Array$<Ref$<TreeItemType>>> => S.mutable(S.Array(Ref(TreeItemType))))),
  done: S.optional(S.Boolean),
}) {}

export class TreeType extends TypedObject({ typename: 'dxos.org/type/Tree', version: '0.1.0' })({
  name: S.optional(S.String),
  root: Ref(TreeItemType),
  checkbox: S.optional(S.Boolean),
}) {}
