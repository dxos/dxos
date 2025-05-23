//
// Copyright 2025 DXOS.org
//

import { Chess } from 'chess.js';

import { Capabilities, contributes, createResolver } from '@dxos/app-framework';
import { live } from '@dxos/live-object';

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
            object: live(ChessType, { name, fen, pgn }),
          },
        };
      },
    }),
  );
