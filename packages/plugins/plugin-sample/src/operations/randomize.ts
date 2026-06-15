//
// Copyright 2025 DXOS.org
//

// Operation handler that randomizes a SampleItem's fields.
// Demonstrates using `@dxos/random` (faker) for generating test data.

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Obj } from '@dxos/echo';
import { random } from '@dxos/random';

import { SampleOperation } from '../types';

const STATUSES: string[] = ['active', 'archived', 'draft'];

const handler: Operation.WithHandler<typeof SampleOperation.Randomize> = SampleOperation.Randomize.pipe(
  Operation.withHandler(({ item }) =>
    Effect.sync(() => {
      Obj.update(item, (item) => {
        item.name = random.lorem.words({ min: 2, max: 5 });
        item.description = random.lorem.sentence();
        item.status = random.helpers.arrayElement(STATUSES);
      });
    }),
  ),
);

export default handler;
