//
// Copyright 2024 DXOS.org
//

import * as S from '@effect/schema/Schema';

import * as E from '@dxos/echo-schema';
import { EchoObjectSchema } from '@dxos/echo-schema';

export class GridItemType extends EchoObjectSchema({ typename: 'braneframe.Grid.Item', version: '0.1.0' })({
  object: E.ref(E.AnyEchoObject),
  position: S.mutable(
    S.struct({
      x: S.number,
      y: S.number,
    }),
  ),
  color: S.optional(S.string),
}) {}

export class GridType extends EchoObjectSchema({ typename: 'braneframe.Grid', version: '0.1.0' })({
  title: S.string,
  items: S.mutable(S.array(E.ref(GridItemType))),
}) {}
