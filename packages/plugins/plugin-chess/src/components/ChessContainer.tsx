//
// Copyright 2024 DXOS.org
//

import { Chess } from 'chess.js';
import React, { useEffect, useState } from 'react';

import { getSpace } from '@dxos/react-client/echo';
import { ChessModel, Board, Chessboard } from '@dxos/react-ui-gameboard';
import { StackItem } from '@dxos/react-ui-stack';

import { type GameType } from '../types';

const ChessContainer = ({ game }: { game: GameType; role?: string }) => {
  const [model, setModel] = useState<ChessModel>(new ChessModel());
  useEffect(() => {
    if (!model || game.pgn !== model?.game.pgn()) {
      const chess = new Chess();
      if (game.pgn) {
        chess.loadPgn(game.pgn);
      }

      // TODO(burdon): Update current model.
      setModel(new ChessModel(chess.fen()));
    }
  }, [game.pgn]);

  const space = getSpace(game);
  if (!space) {
    return null;
  }

  // const showPlayers = false;
  return (
    <StackItem.Content toolbar={false}>
      <div role='none' className='grid grid-rows-[60px_1fr_60px] grow overflow-hidden'>
        <div />

        <Board.Root classNames={'m-4'} model={model} onDrop={(move) => model.makeMove(move)}>
          <Chessboard />
        </Board.Root>

        {/* {showPlayers && <PlayerSelector space={space} game={game} />} */}
      </div>
    </StackItem.Content>
  );
};

export default ChessContainer;
