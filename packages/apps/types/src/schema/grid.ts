//
// Copyright 2024 DXOS.org
//

import { Expando, ref, S, TypedObject } from '@dxos/echo-schema';

export class GridItemType extends TypedObject({ typename: 'dxos.org/type/GridItem', version: '0.1.0' })({
  object: ref(Expando),
  position: S.mutable(
    S.struct({
      x: S.number,
      y: S.number,
    }),
  ),
  color: S.optional(S.string),
}) {}

export class GridType extends TypedObject({ typename: 'dxos.org/type/Grid', version: '0.1.0' })({
  title: S.string,
  items: S.mutable(S.array(ref(GridItemType))),
}) {}
