//

import * as Effect from 'effect/Effect';
// Copyright 2025 DXOS.org
//

import { Operation } from '@dxos/compute';

import { SheetOperation } from '../types';

const handler: Operation.WithHandler<typeof SheetOperation.DropAxis> = SheetOperation.DropAxis.pipe(
  Operation.withHandler(({ model, axis, axisIndex }) =>
    Effect.sync(() => {
      const undoData = model[axis === 'col' ? 'dropColumn' : 'dropRow'](axisIndex);
      return {
        axis: undoData.axis,
        axisIndex: undoData.axisIndex,
        index: undoData.index,
        axisMeta: undoData.axisMeta,
        values: undoData.values,
      };
    }),
  ),
);

export default handler;
