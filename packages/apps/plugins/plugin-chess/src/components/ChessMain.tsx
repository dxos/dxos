//
// Copyright 2023 DXOS.org
//

import { Chess } from 'chess.js';
import React, { useEffect, useState } from 'react';

import { Chessboard, type ChessModel, type ChessMove, type GameType } from '@dxos/chess-app';
import { invariant } from '@dxos/invariant';
import { Main } from '@dxos/react-ui';
import {
  baseSurface,
  topbarBlockPaddingStart,
  fixedInsetFlexLayout,
  bottombarBlockPaddingEnd,
} from '@dxos/react-ui-theme';

const ChessMain = ({ game }: { game: GameType }) => {
  const [model, setModel] = useState<ChessModel>();
  useEffect(() => {
    if (!model || game.pgn !== model?.chess.pgn()) {
      const chess = new Chess();
      if (game.pgn) {
        chess.loadPgn(game.pgn);
      }

      setModel({ chess });
    }
  }, [game.pgn]);

  const handleUpdate = (move: ChessMove) => {
    invariant(model);
    if (model.chess.move(move)) {
      // TODO(burdon): Add move (requires array of scalars).
      game!.pgn = model.chess.pgn();
      setModel({ ...model });
    }
  };

  if (!model) {
    return null;
  }

  return (
    <Main.Content classNames={[baseSurface, fixedInsetFlexLayout, topbarBlockPaddingStart, bottombarBlockPaddingEnd]}>
      <div className='flex grow justify-center items-center md:m-8'>
        <div className='flex md:min-w-[600px] md:min-h-[600px]'>
          <Chessboard model={model} onUpdate={handleUpdate} />
        </div>
      </div>
    </Main.Content>
  );
};

export default ChessMain;
