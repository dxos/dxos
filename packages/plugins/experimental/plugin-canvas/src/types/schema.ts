//
// Copyright 2024 DXOS.org
//

import { Expando, ref, S, TypedObject } from '@dxos/echo-schema';

export class CanvasItemType extends TypedObject({ typename: 'dxos.org/type/CanvasItem', version: '0.1.0' })({
  object: ref(Expando),
  position: S.mutable(
    S.Struct({
      x: S.Number,
      y: S.Number,
    }),
  ),
  color: S.optional(S.String),
}) {}

export class CanvasType extends TypedObject({ typename: 'dxos.org/type/Canvas', version: '0.1.0' })({
  name: S.optional(S.String),
  items: S.mutable(S.Array(ref(CanvasItemType))),
}) {}
