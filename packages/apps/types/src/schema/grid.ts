//
// Copyright 2024 DXOS.org
//

import { Expando, ref, S, TypedObject } from '@dxos/echo-schema';

export class GridItemType extends TypedObject({ typename: 'dxos.org/type/GridItem', version: '0.1.0' })({
  object: ref(Expando),
  position: S.mutable(
    S.Struct({
      x: S.Number,
      y: S.Number,
    }),
  ),
  color: S.optional(S.String),
}) {}

export class GridType extends TypedObject({ typename: 'dxos.org/type/Grid', version: '0.1.0' })({
  title: S.String,
  items: S.mutable(S.Array(ref(GridItemType))),
}) {}
