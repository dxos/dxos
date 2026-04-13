//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Obj } from '@dxos/echo';
import { random } from '@dxos/random';

export const TestItemSchema = Schema.Struct({
  id: Obj.ID,
  name: Schema.String,
});

export type TestItemType = Schema.Schema.Type<typeof TestItemSchema>;

export const TestList = Schema.Struct({
  items: Schema.mutable(Schema.Array(TestItemSchema)),
});

export type TestList = Schema.Schema.Type<typeof TestList>;

export const createList = (n = 10): TestList => ({
  items: random.helpers.multiple(
    () => ({
      id: random.string.uuid(),
      name: random.commerce.productName(),
    }),
    { count: n },
  ),
});
