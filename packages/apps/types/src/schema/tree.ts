//
// Copyright 2024 DXOS.org
//

import { ref, type Ref, S, TypedObject } from '@dxos/echo-schema';

export class TreeItemType extends TypedObject({ typename: 'dxos.org/type/TreeItem', version: '0.1.0' })({
  content: S.String,
  items: S.suspend((): S.Schema<Ref<TreeItemType>[]> => S.mutable(S.Array(ref(TreeItemType)))),
  done: S.optional(S.Boolean),
}) {}

export class TreeType extends TypedObject({ typename: 'dxos.org/type/Tree', version: '0.1.0' })({
  name: S.optional(S.String),
  root: ref(TreeItemType),
  checkbox: S.optional(S.Boolean),
}) {}
