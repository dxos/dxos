//
// Copyright 2024 DXOS.org
//

import * as S from '@effect/schema/Schema';

import * as E from '@dxos/echo-schema';
import { TextV0Type } from './document';

export class TreeItemType extends E.EchoObjectSchema({ typename: 'braneframe.Tree.Item', version: '0.1.0' })({
  text: E.ref(TextV0Type),
  items: S.array(S.suspend((): S.Schema<TreeItemType> => TreeItemType)),
  done: S.boolean,
}) {}

export class TreeType extends E.EchoObjectSchema({ typename: 'braneframe.Tree', version: '0.1.0' })({
  title: S.string,
  root: E.ref(TreeItemType),
  checkbox: S.boolean,
}) {}

export const isTree = (data: unknown): data is TreeType => data instanceof TreeType;
