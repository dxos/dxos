//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/operation';

import { DropAxis } from './definitions';

const handler: Operation.WithHandler<typeof DropAxis> = DropAxis.pipe(
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
