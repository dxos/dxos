//
// Copyright 2023 DXOS.org
//

import * as Schema from 'effect/Schema';

import { DXN, Ref, Type } from '@dxos/echo';
import { ObjectId } from '@dxos/keys';

//
// Test Data
//

export const TestItem = Schema.Struct({
  name: Schema.String,
  description: Schema.optional(Schema.String),
  label: Schema.optional(Schema.String),
}).pipe(Type.makeObject(DXN.make('com.example.type.item', '0.1.0')));

export type TestItem = Type.InstanceType<typeof TestItem>;

export const TestColumn = Schema.Struct({
  id: ObjectId,
  name: Schema.String,
  items: Schema.mutable(Schema.Array(Ref.Ref(TestItem))),
}).pipe(Type.makeObject(DXN.make('com.example.type.column', '0.1.0')));

export type TestColumn = Type.InstanceType<typeof TestColumn>;
