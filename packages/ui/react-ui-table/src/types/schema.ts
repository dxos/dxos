//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';

import { Type } from '@dxos/echo';
import { LabelAnnotation } from '@dxos/echo-schema';
import { JsonPath } from '@dxos/effect';

export const TableView = Schema.Struct({
  name: Schema.optional(Schema.String),
  sizes: Schema.Record({
    key: JsonPath,
    value: Schema.Number,
  }).pipe(Schema.mutable),
})
  .pipe(LabelAnnotation.set(['name']))
  .pipe(Type.Obj({ typename: 'dxos.org/type/TableView', version: '0.1.0' }));
export type TableView = Schema.Schema.Type<typeof TableView>;
