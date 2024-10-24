//
// Copyright 2024 DXOS.org
//

import { S } from '@dxos/echo-schema';
import { faker } from '@dxos/random';

export const TestItemSchema = S.Struct({
  id: S.String,
  name: S.String,
});

export type TestItemType = S.Schema.Type<typeof TestItemSchema>;

export const TestList = S.Struct({
  items: S.mutable(S.Array(TestItemSchema)),
});

export type TestList = S.Schema.Type<typeof TestList>;

export const createList = (n = 10): TestList => ({
  items: faker.helpers.multiple(
    () => ({
      id: faker.string.uuid(),
      name: faker.commerce.productName(),
    }),
    { count: n },
  ),
});
