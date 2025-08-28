//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';

import { Type } from '@dxos/echo';
import { ViewAnnotation } from '@dxos/echo/internal';
import { JsonPath } from '@dxos/effect';

export const TableView = Schema.Struct({
  sizes: Schema.Record({
    key: JsonPath,
    value: Schema.Number,
  }).pipe(Schema.mutable),
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/TableView',
    version: '0.1.0',
  }),
  ViewAnnotation.set(true),
);
export type TableView = Schema.Schema.Type<typeof TableView>;
