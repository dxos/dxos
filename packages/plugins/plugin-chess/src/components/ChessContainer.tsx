//
// Copyright 2024 DXOS.org
//

import { Chess } from 'chess.js';
import React, { useEffect, useState } from 'react';

import { getSpace } from '@dxos/react-client/echo';
import { ChessModel, Board, Chessboard } from '@dxos/react-ui-gameboard';
import { StackItem } from '@dxos/react-ui-stack';

import { PlayerSelector } from './PlayerSelector';
import { type GameType } from '../types';

const ChessContainer = ({ game }: { game: GameType; role?: string }) => {
  const [model, setModel] = useState<ChessModel>();
  useEffect(() => {
    if (!model || game.pgn !== model?.game.pgn()) {
      const chess = new Chess();
      if (game.pgn) {
        chess.loadPgn(game.pgn);
      }

      setModel(new ChessModel(chess.fen()));
    }
  }, [game.pgn]);

  const space = getSpace(game);
  if (!space) {
    return null;
  }

  return (
    <StackItem.Content toolbar={false}>
      <div role='none' className='grid grid-rows-[60px_1fr_60px] grow overflow-hidden'>
        <div />
        <div className='flex grow justify-center overflow-hidden'>
          <div className='flex grow max-w-[600px] items-center overflow-hidden'>
            <Board.Root model={model} onDrop={model ? (move) => model.makeMove(move) : undefined}>
              <Chessboard />
            </Board.Root>
          </div>
        </div>

        <PlayerSelector game={game} space={space} />
      </div>
    </StackItem.Content>
  );
};

export default ChessContainer;
