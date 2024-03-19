//
// Copyright 2024 DXOS.org
//

import * as S from '@effect/schema/Schema';

import * as E from '@dxos/echo-schema';

const _TableSchema = S.struct({
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
}).pipe(E.echoObject('braneframe.Table', '0.1.0'));
export interface TableType extends E.ObjectType<typeof _TableSchema> {}
export const TableSchema: S.Schema<TableType> = _TableSchema;

export const isTable = (data: unknown): data is TableType => !!data && E.getSchema(data) === TableSchema;
