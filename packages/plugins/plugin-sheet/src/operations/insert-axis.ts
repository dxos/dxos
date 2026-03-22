//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/operation';

import { InsertAxis } from './definitions';

const handler: Operation.WithHandler<typeof InsertAxis> = InsertAxis.pipe(
  Operation.withHandler(({ model, axis, index, count }) =>
    Effect.sync(() => {
      model[axis === 'col' ? 'insertColumns' : 'insertRows'](index, count);
    }),
  ),
);

export default handler;
