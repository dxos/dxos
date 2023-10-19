//
// Copyright 2023 DXOS.org
//

import { Chess } from 'chess.js';
import React, { useEffect, useState } from 'react';

import { Main } from '@dxos/react-ui';
import { baseSurface, coarseBlockPaddingStart, fixedInsetFlexLayout } from '@dxos/react-ui-theme';
import { Chessboard, type ChessModel, type ChessMove, type Game } from '@dxos/chess-app';
import { invariant } from '@dxos/invariant';

export const ChessMain = ({ data: object }: { data: Game }) => {
  const [model, setModel] = useState<ChessModel>();
  useEffect(() => {
    if (!model || object.pgn !== model?.chess.pgn()) {
      const chess = new Chess();
      if (object.pgn) {
        chess.loadPgn(object.pgn);
      }

      setModel({ chess });
    }
  }, [object.pgn]);

  const handleUpdate = (move: ChessMove) => {
    invariant(model);
    if (model.chess.move(move)) {
      // TODO(burdon): Add move (requires array of scalars).
      object!.pgn = model.chess.pgn();
      setModel({ ...model });
    }
  };

  if (!model) {
    return null;
  }

  return (
    <Main.Content classNames={[baseSurface, fixedInsetFlexLayout, coarseBlockPaddingStart]}>
      <div className='flex grow justify-center items-center md:m-8'>
        <div className='flex md:min-w-[600px] md:min-h-[600px]'>
          <Chessboard model={model} onUpdate={handleUpdate} />
        </div>
      </div>
    </Main.Content>
  );
};
