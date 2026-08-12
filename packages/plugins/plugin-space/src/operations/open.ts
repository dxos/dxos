// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';

import * as SpaceOperation from '../types/SpaceOperation';

const handler: Operation.WithHandler<typeof SpaceOperation.Open> = SpaceOperation.Open.pipe(
  Operation.withHandler((input) =>
    Effect.promise(async () => {
      await input.space.open();
    }),
  ),
);
export default handler;
