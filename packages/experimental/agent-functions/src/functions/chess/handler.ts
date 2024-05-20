//
// Copyright 2023 DXOS.org
//

import { subscriptionHandler } from '@dxos/functions';
import { invariant } from '@dxos/invariant';
import { registerTypes } from '../../util';

import { Engine } from './engine';

export const handler = subscriptionHandler(async ({ event }) => {
  const {
    meta: { level = 1 },
    space,
    objects,
  } = event.data;
  invariant(space);
  registerTypes(space);

  for (const game of objects ?? []) {
    if (game.pgn) {
      const engine = new Engine({ pgn: game.pgn, level });

      // TODO(burdon): Only trigger if has player credential (identity from context).
      const side = 'b';
      if (!engine.state.isGameOver() && engine.state.turn() === side) {
        engine.move();
        game.pgn = engine.state.pgn();

        // eslint-disable-next-line no-console
        console.log(`History: ${engine.state.pgn().length}\n` + engine.state.ascii());
      }
    }
  }
});
