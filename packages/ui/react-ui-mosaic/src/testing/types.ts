//
// Copyright 2023 DXOS.org
//

import * as Schema from 'effect/Schema';

import { DXN, Ref, Type } from '@dxos/echo';
import { EntityId } from '@dxos/keys';

//
// Test Data
//

export class TestItem extends Type.makeObject<TestItem>(DXN.make('com.example.type.item', '0.1.0'))(
  Schema.Struct({
    name: Schema.String,
    description: Schema.optional(Schema.String),
    label: Schema.optional(Schema.String),
  }),
) {}

export class TestColumn extends Type.makeObject<TestColumn>(DXN.make('com.example.type.column', '0.1.0'))(
  Schema.Struct({
    id: EntityId,
    name: Schema.String,
    items: Schema.mutable(Schema.Array(Ref.Ref(TestItem))),
  }),
) {}
