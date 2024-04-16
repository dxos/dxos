//
// Copyright 2024 DXOS.org
//

import { S, DynamicEchoSchema, TypedObject, ref } from '@dxos/echo-schema';

const TableTypePropSchema = S.partial(
  S.mutable(
    S.struct({
      id: S.string,
      prop: S.string,
      label: S.string,
      ref: S.string,
      refProp: S.string,
      size: S.number,
    }),
  ),
);
export type TableTypeProp = S.Schema.Type<typeof TableTypePropSchema>;

export class TableType extends TypedObject({ typename: 'braneframe.Table', version: '0.1.0' })({
  title: S.string,
  schema: S.optional(ref(DynamicEchoSchema)),
  props: S.mutable(S.array(TableTypePropSchema)),
}) {}
