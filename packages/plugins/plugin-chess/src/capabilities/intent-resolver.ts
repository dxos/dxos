//
// Copyright 2025 DXOS.org
//

import { Chess as Game } from 'chess.js';

import { Capabilities, contributes, createResolver } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';

import { Chess, ChessAction } from '../types';

export default () =>
  contributes(
    Capabilities.IntentResolver,
    createResolver({
      intent: ChessAction.Create,
      resolve: ({ name, fen }) => {
        const pgn = fen ? new Game(fen).pgn() : undefined;
        return {
          data: {
            object: Obj.make(Chess.Game, { name, fen, pgn }),
          },
        };
      },
    }),
  );
