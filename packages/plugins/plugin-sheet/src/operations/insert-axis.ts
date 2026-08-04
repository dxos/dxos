//

import * as Effect from 'effect/Effect';
// Copyright 2025 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';

import * as SheetOperation from '../types/SheetOperation';

const handler: Operation.WithHandler<typeof SheetOperation.InsertAxis> = SheetOperation.InsertAxis.pipe(
  Operation.withHandler(({ model, axis, index, count }) =>
    Effect.sync(() => {
      model[axis === 'col' ? 'insertColumns' : 'insertRows'](index, count);
    }),
  ),
);

export default handler;
