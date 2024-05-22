//
// Copyright 2024 DXOS.org
//

import { Chess as ChessJs } from 'chess.js';
import React, { useEffect, useState } from 'react';

import { Chessboard, type ChessModel, type ChessMove, type GameType } from '@dxos/chess-app';
import { invariant } from '@dxos/invariant';

export const Chess = ({ game }: { game: GameType }) => {
  const [model, setModel] = useState<ChessModel>();
  useEffect(() => {
    if (!model || game.pgn !== model?.chess.pgn()) {
      const chess = new ChessJs();
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

  return <Chessboard model={model} onUpdate={handleUpdate} />;
};
