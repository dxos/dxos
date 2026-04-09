//
// Copyright 2025 DXOS.org
//

// Operation handler that randomizes an ExemplarItem's fields.
// Demonstrates using `@dxos/random` (faker) for generating test data.

import * as Effect from 'effect/Effect';

import { Obj } from '@dxos/echo';
import { Operation } from '@dxos/operation';
import { faker } from '@dxos/random';

import { Randomize } from './definitions';

const STATUSES: string[] = ['active', 'archived', 'draft'];

const handler: Operation.WithHandler<typeof Randomize> = Randomize.pipe(
  Operation.withHandler(({ item }) =>
    Effect.sync(() => {
      Obj.change(item, (draft) => {
        draft.name = faker.lorem.words({ min: 2, max: 5 });
        draft.description = faker.lorem.sentence();
        draft.status = faker.helpers.arrayElement(STATUSES);
      });
    }),
  ),
);

export default handler;
