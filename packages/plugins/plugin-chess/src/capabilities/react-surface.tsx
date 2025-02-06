//
// Copyright 2025 DXOS.org
//

import { Chess } from 'chess.js';
import React from 'react';

import { Capabilities, contributes, createSurface } from '@dxos/app-framework';
import { isInstanceOf } from '@dxos/echo-schema';

import { Chessboard, ChessContainer } from '../components';
import { CHESS_PLUGIN } from '../meta';
import { ChessType, isObject } from '../types';

export default () =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: CHESS_PLUGIN,
      role: ['article', 'section'],
      filter: (data): data is { subject: ChessType } => isObject(data.subject),
      component: ({ data, role }) => <ChessContainer game={data.subject} role={role} />,
    }),
    createSurface({
      id: 'plugin-chess',
      role: 'canvas-node',
      filter: (data): data is any => isInstanceOf(ChessType, data),
      component: ({ data }) => (
        <Chessboard
          model={{ chess: new Chess(data.fen) }}
          onUpdate={(move) => {
            const board = new Chess(data.fen);
            board.move(move);
            data.value = board.fen();
          }}
        />
      ),
    }),
  ]);
