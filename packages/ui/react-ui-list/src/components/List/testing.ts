//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { ObjectId } from '@dxos/echo-schema';
import { faker } from '@dxos/random';

export const TestItemSchema = Schema.Struct({
  id: ObjectId,
  name: Schema.String,
});

export type TestItemType = Schema.Schema.Type<typeof TestItemSchema>;

export const TestList = Schema.Struct({
  items: Schema.mutable(Schema.Array(TestItemSchema)),
});

export type TestList = Schema.Schema.Type<typeof TestList>;

export const createList = (n = 10): TestList => ({
  items: faker.helpers.multiple(
    () => ({
      id: faker.string.uuid(),
      name: faker.commerce.productName(),
    }),
    { count: n },
  ),
});
