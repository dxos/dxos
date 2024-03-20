//
// Copyright 2024 DXOS.org
//

import * as S from '@effect/schema/Schema';

import * as E from '@dxos/echo-schema';

interface Item extends E.Identifiable {
  text: string;
  items: Item[];
  done: boolean;
}

const _TreeItemSchema: S.Schema<Item> = S.struct({
  text: S.string,
  items: S.array(S.suspend(() => _TreeItemSchema)),
  done: S.boolean,
}).pipe(E.echoObject('braneframe.Tree.Item', '0.1.0'));
export interface TreeItemType extends E.ObjectType<typeof _TreeItemSchema> {}
export const TreeItemSchema: S.Schema<TreeItemType> = _TreeItemSchema;

const _TreeSchema = S.struct({
  title: S.string,
  root: E.ref(TreeItemSchema),
  checkbox: S.boolean,
}).pipe(E.echoObject('braneframe.Tree', '0.1.0'));
export interface TreeType extends E.ObjectType<typeof _TreeSchema> {}
export const TreeSchema: S.Schema<TreeType> = _TreeSchema;

export const isTree = (data: unknown): data is TreeType => !!data && E.getSchema(data) === TreeSchema;
