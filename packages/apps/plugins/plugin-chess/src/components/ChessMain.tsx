//
// Copyright 2023 DXOS.org
//

import { Chess } from 'chess.js';
import React, { useEffect, useState } from 'react';
import invariant from 'tiny-invariant';

import { Main } from '@dxos/aurora';
import { baseSurface, mx } from '@dxos/aurora-theme';
import { Chessboard, ChessModel, ChessMove } from '@dxos/chess-app';
import { SpaceProxy, TypedObject } from '@dxos/client/echo';

export const ChessMain = ({ data: { object } }: { data: { space: SpaceProxy; object: TypedObject } }) => {
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
      // TODO(burdon): Rename pgn => pgn.
      // TODO(burdon): Add move (requires array of scalars).
      object!.pgn = model.chess.pgn();
      setModel({ ...model });
    }
  };

  if (!model) {
    return null;
  }

  return (
    <Main.Content classNames={mx('flex flex-col grow min-bs-[100vh] overflow-hidden', baseSurface)}>
      <div className='flex grow justify-center items-center md:m-8'>
        <div className='flex md:min-w-[600px] md:min-h-[600px]'>
          <Chessboard model={model} onUpdate={handleUpdate} />
        </div>
      </div>
    </Main.Content>
  );
};
