//
// Copyright 2024 DXOS.org
//

import { S } from '@dxos/echo-schema';
import { faker } from '@dxos/random';

export const TestSchema = S.Struct({
  id: S.String,
  name: S.String,
});

export type TestType = S.Schema.Type<typeof TestSchema>;

export const createItems = (n = 10): TestType[] =>
  faker.helpers.multiple(
    () => ({
      id: faker.string.uuid(),
      name: faker.lorem.sentence(),
    }),
    { count: n },
  );
