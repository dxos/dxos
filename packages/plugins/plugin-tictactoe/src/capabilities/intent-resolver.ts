//
// Copyright 2023 DXOS.org
//

import { Capabilities, contributes, type Intent } from '@dxos/app-framework';
import { getSpace } from '@dxos/react-client/echo';

import { TicTacToeAction, TicTacToeType } from '../types';

export default () =>
  contributes(Capabilities.IntentResolver, (intent: Intent) => {
    switch (intent.action.class) {
      case TicTacToeAction.Create: {
        const { name } = intent.action.input;
        const space = getSpace(intent.target);
        if (!space) {
          return false;
        }

        const object = space.db.add(
          new TicTacToeType({
            name: name ?? 'New TicTacToe Game',
            board: [
              [null, null, null],
              [null, null, null],
              [null, null, null],
            ],
            currentPlayer: 'X',
            winner: undefined,
            gameOver: false,
          }),
        );

        return { object };
      }
    }

    return false;
  });
