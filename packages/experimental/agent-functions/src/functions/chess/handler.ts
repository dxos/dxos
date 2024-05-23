//
// Copyright 2023 DXOS.org
//

import { subscriptionHandler } from '@dxos/functions';
import { invariant } from '@dxos/invariant';

import { Engine } from './engine';
import { registerTypes } from '../../util';

export const handler = subscriptionHandler<{ level?: number }>(async ({ event }) => {
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

        const title = `Move ${engine.state.moveNumber()}`;
        // eslint-disable-next-line no-console
        console.log(`\n${title.padStart(15 + title.length / 2)}\n` + engine.state.ascii() + '\n');
      }
    }
  }
});
