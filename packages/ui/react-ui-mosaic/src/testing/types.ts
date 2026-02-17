//
// Copyright 2023 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Type } from '@dxos/echo';
import { ObjectId } from '@dxos/keys';

//
// Test Data
//

export const TestItem = Schema.Struct({
  name: Schema.String,
  description: Schema.optional(Schema.String),
  label: Schema.optional(Schema.String),
}).pipe(
  Type.object({
    typename: 'example.com/type/Item',
    version: '0.1.0',
  }),
);

export interface TestItem extends Schema.Schema.Type<typeof TestItem> {}

export const TestColumn = Schema.Struct({
  id: ObjectId,
  name: Schema.String,
  items: Schema.mutable(Schema.Array(Type.Ref(TestItem))),
}).pipe(
  Type.object({
    typename: 'example.com/type/Column',
    version: '0.1.0',
  }),
);

export interface TestColumn extends Schema.Schema.Type<typeof TestColumn> {}
