//
// Copyright 2023 DXOS.org
//

import { subscriptionHandler } from '@dxos/functions';
import { invariant } from '@dxos/invariant';

import { Engine } from './engine';
import { registerTypes } from '../../util';

type Meta = { level?: number; side?: string };

export const handler = subscriptionHandler<Meta>(async ({ event }) => {
  const { meta: { level = 1, side = 'b' } = {}, space, objects } = event.data;
  invariant(space);
  registerTypes(space);

  for (const game of objects ?? []) {
    const engine = new Engine({ pgn: game.pgn ?? '', level });
    if (!engine.state.isGameOver() && engine.state.turn() === side) {
      engine.move();
      engine.print();

      // Update object.
      game.pgn = engine.state.pgn();
    }
  }
});
