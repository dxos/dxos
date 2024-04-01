//
// Copyright 2024 DXOS.org
//

import * as S from '@effect/schema/Schema';

import { EchoObjectSchema } from '@dxos/echo-schema';

export class TableType extends EchoObjectSchema({ typename: 'braneframe.Table', version: '0.1.0' })({
  title: S.string,
  // schema: ???,
  props: S.array(
    S.struct({
      id: S.string,
      prop: S.string,
      label: S.string,
      ref: S.string,
      size: S.number,
    }),
  ),
}) {}
