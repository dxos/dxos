//
// Copyright 2023 DXOS.org
//

import { subscriptionHandler } from '@dxos/functions';
import { invariant } from '@dxos/invariant';

import { Engine } from './engine';
import { registerTypes } from '../../util';

type Meta = { level?: number };

export const handler = subscriptionHandler<Meta>(async ({ event }) => {
  const {
    meta: { level = 1 },
    space,
    objects,
  } = event.data;
  invariant(space);
  registerTypes(space);

  for (const game of objects ?? []) {
    const engine = new Engine({ pgn: game.pgn, level });

    // TODO(burdon): Only trigger if has player credential (identity from context).
    const side = 'b';
    if (!engine.state.isGameOver() && engine.state.turn() === side) {
      engine.move();
      engine.print();

      // Update object.
      game.pgn = engine.state.pgn();
    }
  }
});
