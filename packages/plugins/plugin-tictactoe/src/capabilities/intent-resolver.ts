//
// Copyright 2023 DXOS.org
//

import { Capabilities, contributes, createResolver } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';

import { TicTacToeAction, TicTacToeType } from '../types';

export default () =>
  contributes(
    Capabilities.IntentResolver,
    createResolver({
      intent: TicTacToeAction.Create,
      resolve: ({ name }) => ({
        data: {
          object: Obj.make(TicTacToeType, {
            name: name ?? 'New TicTacToe Game',
            board: [
              [null, null, null],
              [null, null, null],
              [null, null, null],
            ],
            currentPlayer: 'X',
            winner: null,
            gameOver: false,
          }),
        },
      }),
    }),
  );
