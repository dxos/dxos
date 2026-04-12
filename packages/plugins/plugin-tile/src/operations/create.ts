//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database } from '@dxos/echo';
import { Operation } from '@dxos/operation';

import { Tile } from '#types';

import { Create } from './definitions';

const handler: Operation.WithHandler<typeof Create> = Create.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ name, gridType, gridWidth, gridHeight, tileSize, groutWidth }) {
      const pattern = Tile.make({ name, gridType, gridWidth, gridHeight, tileSize, groutWidth });
      return yield* Database.add(pattern);
    }),
  ),
);

export default handler;
