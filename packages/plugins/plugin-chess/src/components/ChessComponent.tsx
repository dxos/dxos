//
// Copyright 2024 DXOS.org
//

import { Chess } from 'chess.js';
import React, { useCallback, useEffect, useMemo } from 'react';

import { log } from '@dxos/log';
import { getSpace } from '@dxos/react-client/echo';
import { ChessModel, Gameboard, Chessboard, type GameboardRootProps } from '@dxos/react-ui-gameboard';

import { type ChessType } from '../types';

export const ChessComponent = ({ game }: { game: ChessType }) => {
  const model = useMemo(() => new ChessModel(), []);
  useEffect(() => {
    if (!model || game.pgn !== model?.game.pgn()) {
      const chess = new Chess();
      if (game.pgn) {
        try {
          chess.loadPgn(game.pgn);
        } catch (err) {
          log.catch(err, { game });
        }
      }

      model.initialize(chess.fen());
    }
  }, [game.pgn]);

  const space = getSpace(game);
  if (!space) {
    return null;
  }

  const handleDrop = useCallback<NonNullable<GameboardRootProps['onDrop']>>(
    (move) => {
      if (model.makeMove(move)) {
        game.pgn = model.game.pgn();
        game.fen = model.game.fen();
        return true;
      }

      return false;
    },
    [model],
  );

  return (
    <Gameboard.Root model={model} onDrop={handleDrop}>
      <Chessboard />
    </Gameboard.Root>
  );
};
