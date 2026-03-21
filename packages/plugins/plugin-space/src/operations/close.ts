// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/operation';

import { SpaceOperation } from './definitions';

export default SpaceOperation.Close.pipe(
  Operation.withHandler((input) =>
    Effect.promise(async () => {
      await input.space.close();
    }),
  ),
);
