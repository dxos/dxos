//
// Copyright 2025 DXOS.org
//

import { Chess } from 'chess.js';

import { Capabilities, contributes, createResolver } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';

import { ChessAction, ChessType } from '../types';

export default () =>
  contributes(
    Capabilities.IntentResolver,
    createResolver({
      intent: ChessAction.Create,
      resolve: ({ name, fen }) => {
        const pgn = fen ? new Chess(fen).pgn() : undefined;
        return {
          data: {
            object: Obj.make(ChessType, { name, fen, pgn }),
          },
        };
      },
    }),
  );
