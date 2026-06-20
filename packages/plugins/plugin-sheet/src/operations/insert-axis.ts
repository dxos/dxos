//

import * as Effect from 'effect/Effect';
// Copyright 2025 DXOS.org
//

import { Operation } from '@dxos/compute';

import { SheetOperation } from '../types';

const handler: Operation.WithHandler<typeof SheetOperation.InsertAxis> = SheetOperation.InsertAxis.pipe(
  Operation.withHandler(({ model, axis, index, count }) =>
    Effect.sync(() => {
      model[axis === 'col' ? 'insertColumns' : 'insertRows'](index, count);
    }),
  ),
);

export default handler;
