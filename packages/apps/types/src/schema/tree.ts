//
// Copyright 2024 DXOS.org
//

import { ref, type Ref, S, TypedObject } from '@dxos/echo-schema';

import { TextV0Type } from './document';

export class TreeItemType extends TypedObject({ typename: 'braneframe.Tree.Item', version: '0.1.0' })({
  text: ref(TextV0Type),
  items: S.suspend((): S.Schema<Ref<TreeItemType>[]> => S.mutable(S.array(ref(TreeItemType)))),
  done: S.optional(S.boolean),
}) {}

export class TreeType extends TypedObject({ typename: 'braneframe.Tree', version: '0.1.0' })({
  title: S.optional(S.string),
  root: ref(TreeItemType),
  checkbox: S.optional(S.boolean),
}) {}
