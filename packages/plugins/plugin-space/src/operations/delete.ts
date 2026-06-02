//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';

import { SpaceOperation } from './definitions';

const handler: Operation.WithHandler<typeof SpaceOperation.Delete> = SpaceOperation.Delete.pipe(
  Operation.withHandler((input) =>
    Effect.promise(async () => {
      await input.space.delete();
    }),
  ),
);
export default handler;
