//
// Copyright 2024 DXOS.org
//

import * as S from '@effect/schema/Schema';

import * as E from '@dxos/echo-schema';

const _GridItemSchema = S.struct({
  object: E.ref(E.AnyEchoObject),
  position: S.struct({
    x: S.number,
    y: S.number,
  }),
  color: S.string,
}).pipe(E.echoObject('braneframe.Grid.Item', '0.1.0'));
export interface GridItemType extends E.ObjectType<typeof _GridItemSchema> {}
export const GridItemSchema: S.Schema<GridItemType> = _GridItemSchema;

const _GridSchema = S.struct({
  title: S.string,
  items: S.array(E.ref(GridItemSchema)),
}).pipe(E.echoObject('braneframe.Grid', '0.1.0'));
export interface GridType extends E.ObjectType<typeof _GridSchema> {}
export const GridSchema: S.Schema<GridType> = _GridSchema;

export const isGrid = (data: unknown): data is GridType => !!data && E.getSchema(data) === GridSchema;
