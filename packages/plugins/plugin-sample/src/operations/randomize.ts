//
// Copyright 2025 DXOS.org
//

// Operation handler that randomizes a SampleItem's fields.
// Demonstrates using `@dxos/random` (faker) for generating test data.

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Obj } from '@dxos/echo';
import { random } from '@dxos/random';

import * as SampleOperation from '../types/SampleOperation';

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
