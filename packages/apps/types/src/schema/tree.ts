//
// Copyright 2024 DXOS.org
//

import { S } from '@dxos/echo-schema';
import * as E from '@dxos/echo-schema';

import { TextV0Type } from './document';

export class TreeItemType extends E.TypedObject({ typename: 'braneframe.Tree.Item', version: '0.1.0' })({
  text: E.ref(TextV0Type),
  items: S.suspend((): S.Schema<E.Ref<TreeItemType>[]> => S.mutable(S.array(E.ref(TreeItemType)))),
  done: S.optional(S.boolean),
}) {}

export class TreeType extends E.TypedObject({ typename: 'braneframe.Tree', version: '0.1.0' })({
  title: S.optional(S.string),
  root: E.ref(TreeItemType),
  checkbox: S.optional(S.boolean),
}) {}
