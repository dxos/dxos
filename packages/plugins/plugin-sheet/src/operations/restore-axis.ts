//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/operation';

import { RestoreAxis } from './definitions';

const handler: Operation.WithHandler<typeof RestoreAxis> = RestoreAxis.pipe(
  Operation.withHandler(({ model, axis, ...restoreData }) =>
    Effect.sync(() => {
      model[axis === 'col' ? 'restoreColumn' : 'restoreRow'](restoreData);
    }),
  ),
);

export default handler;
