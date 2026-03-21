//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/operation';

import { RestoreAxis } from './definitions';

export default RestoreAxis.pipe(
  Operation.withHandler(({ model, axis, ...restoreData }) =>
    Effect.sync(() => {
      model[axis === 'col' ? 'restoreColumn' : 'restoreRow'](restoreData);
    }),
  ),
);
