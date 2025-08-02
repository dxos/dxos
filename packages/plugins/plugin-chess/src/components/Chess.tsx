//
// Copyright 2024 DXOS.org
//

import { Chess as ChessJS } from 'chess.js';
import React, { type PropsWithChildren, useCallback, useEffect, useMemo } from 'react';

import { log } from '@dxos/log';
import { ChessModel, Gameboard, Chessboard, type GameboardRootProps } from '@dxos/react-ui-gameboard';

import { Chess } from '../types';

const ChessRoot = ({ game, children }: PropsWithChildren<{ game: Chess.Game }>) => {
  const model = useMemo(() => new ChessModel(), []);
  useEffect(() => {
    if (!model || game.pgn !== model?.game.pgn()) {
      const chess = new ChessJS();
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
      {children}
    </Gameboard.Root>
  );
};

export const Chess = {
  Root: ChessRoot,
  Content: Gameboard.Content,
  Board: Chessboard,
};
