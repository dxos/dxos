//
// Copyright 2024 DXOS.org
//

import { DynamicSchema, ref, S, TypedObject } from '@dxos/echo-schema';

const TablePropSchema = S.partial(
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

export type TableProp = S.Schema.Type<typeof TablePropSchema>;

export class TableType extends TypedObject({ typename: 'dxos.org/type/Table', version: '0.1.0' })({
  name: S.optional(S.String),
  schema: S.optional(ref(DynamicSchema)),
  props: S.mutable(S.Array(TablePropSchema)),
}) {}
