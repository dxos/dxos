//
// Copyright 2025 DXOS.org
//

import { Chess } from 'chess.js';

import { Capabilities, contributes, createResolver } from '@dxos/app-framework';
import { create } from '@dxos/live-object';

import { ChessAction, ChessType } from '../types';

export default () =>
  contributes(
    Capabilities.IntentResolver,
    createResolver(ChessAction.Create, ({ name, fen }) => {
      const pgn = fen ? new Chess(fen).pgn() : undefined;

      return {
        data: {
          object: create(ChessType, { name, fen, pgn }),
        },
      };
    }),
  );
