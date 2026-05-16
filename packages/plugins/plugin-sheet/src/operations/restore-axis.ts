//

import * as Effect from 'effect/Effect';
// Copyright 2025 DXOS.org
//

import { Operation } from '@dxos/compute';

import { SheetOperation } from '../types';

const handler: Operation.WithHandler<typeof SheetOperation.RestoreAxis> = SheetOperation.RestoreAxis.pipe(
  Operation.withHandler(({ model, axis, ...restoreData }) =>
    Effect.sync(() => {
      model[axis === 'col' ? 'restoreColumn' : 'restoreRow'](restoreData);
    }),
  ),
);

export default handler;
