//
// Copyright 2024 DXOS.org
//

import { S, TypedObject } from '@dxos/echo-schema';
import * as E from '@dxos/echo-schema';

export class GridItemType extends TypedObject({ typename: 'braneframe.Grid.Item', version: '0.1.0' })({
  object: E.ref(E.Expando),
  position: S.mutable(
    S.struct({
      x: S.number,
      y: S.number,
    }),
  ),
  color: S.optional(S.string),
}) {}

export class GridType extends TypedObject({ typename: 'braneframe.Grid', version: '0.1.0' })({
  title: S.string,
  items: S.mutable(S.array(E.ref(GridItemType))),
}) {}
