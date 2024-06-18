//
// Copyright 2024 DXOS.org
//

import { DynamicSchema, ref, S, TypedObject } from '@dxos/echo-schema';

const TableTypePropSchema = S.partial(
  S.mutable(
    S.Struct({
      id: S.String,
      prop: S.String,
      label: S.String,
      ref: S.String,
      refProp: S.String,
      size: S.Number,
    }),
  ),
);

export type TableTypeProp = S.Schema.Type<typeof TableTypePropSchema>;

export class TableType extends TypedObject({ typename: 'braneframe.Table', version: '0.1.0' })({
  title: S.String,
  schema: S.optional(ref(DynamicSchema)),
  props: S.mutable(S.Array(TableTypePropSchema)),
}) {}
