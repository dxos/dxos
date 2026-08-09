//

import * as Effect from 'effect/Effect';
// Copyright 2025 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';

import * as SheetOperation from '../types/SheetOperation';

const handler: Operation.WithHandler<typeof SheetOperation.RestoreAxis> = SheetOperation.RestoreAxis.pipe(
  Operation.withHandler(({ model, axis, ...restoreData }) =>
    Effect.sync(() => {
      model[axis === 'col' ? 'restoreColumn' : 'restoreRow'](restoreData);
    }),
  ),
);

export default handler;
