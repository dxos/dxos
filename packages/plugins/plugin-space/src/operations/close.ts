// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/operation';

import { SpaceOperation } from './definitions';

const handler: Operation.WithHandler<typeof SpaceOperation.Close> = SpaceOperation.Close.pipe(
  Operation.withHandler((input) =>
    Effect.promise(async () => {
      await input.space.close();
    }),
  ),
);
export default handler;
