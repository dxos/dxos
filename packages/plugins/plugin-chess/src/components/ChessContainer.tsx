//
// Copyright 2024 DXOS.org
//

import { Chess } from 'chess.js';
import React, { useCallback, useEffect, useMemo } from 'react';

import { getSpace } from '@dxos/react-client/echo';
import { ChessModel, Board, Chessboard, type BoardRootProps } from '@dxos/react-ui-gameboard';
import { StackItem } from '@dxos/react-ui-stack';

import { PlayerSelector } from './PlayerSelector';
import { type GameType } from '../types';

const ChessContainer = ({ game }: { game: GameType; role?: string }) => {
  const model = useMemo(() => new ChessModel(), []);
  useEffect(() => {
    if (!model || game.pgn !== model?.game.pgn()) {
      const chess = new Chess();
      if (game.pgn) {
        chess.loadPgn(game.pgn);
      }

      model.initialize(chess.fen());
    }
  }, [game.pgn]);

  const space = getSpace(game);
  if (!space) {
    return null;
  }

  const handleDrop = useCallback<NonNullable<BoardRootProps['onDrop']>>(
    (move) => {
      if (model.makeMove(move)) {
        game.pgn = model.game.pgn();
        return true;
      }

      return false;
    },
    [model],
  );

  return (
    <StackItem.Content toolbar={false}>
      <div role='none' className='grid grid-rows-[60px_1fr_60px] grow overflow-hidden'>
        <div />

        <div className='flex m-4 overflow-hidden'>
          <Board.Root model={model} onDrop={handleDrop}>
            <Chessboard />
          </Board.Root>
        </div>

        <PlayerSelector space={space} game={game} />
      </div>
    </StackItem.Content>
  );
};

export default ChessContainer;
