//
// Copyright 2024 DXOS.org
//

import * as S from '@effect/schema/Schema';

import * as E from '@dxos/echo-schema';
import { TextV0Type } from './document';

interface _TreeItemType extends E.Identifiable {
  text: TextV0Type;
  items: _TreeItemType[];
  done: boolean;
}

// TODO(wittjosiah): Migrate to EchoSchemaObject.
const _TreeItemType: S.Schema<_TreeItemType> = S.struct({
  text: E.ref(TextV0Type),
  items: S.array(S.suspend(() => _TreeItemType)),
  done: S.boolean,
}).pipe(E.echoObject('braneframe.Tree.Item', '0.1.0'));
export interface TreeItemType extends E.ObjectType<typeof _TreeItemType> {}
export const TreeItemType: S.Schema<TreeItemType> = _TreeItemType;

export class TreeType extends E.EchoObjectSchema({ typename: 'braneframe.Tree', version: '0.1.0' })({
  title: S.string,
  root: E.ref(TreeItemType),
  checkbox: S.boolean,
}) {}

export const isTree = (data: unknown): data is TreeType => data instanceof TreeType;
