//
// Copyright 2023 DXOS.org
//

import { Chess } from 'chess.js';
import React, { FC, useEffect, useState } from 'react';
import { Chessboard as ReactChessboard } from 'react-chessboard';

import { Game } from './proto';

const props = {
  customDarkSquareStyle: { backgroundColor: '#dcdcdc' },
  customLightSquareStyle: { backgroundColor: '#f5f5f5' }
};

/**
 * https://www.npmjs.com/package/chess.js
 * https://www.npmjs.com/package/react-chessboard
 */
export const Chessboard: FC<{ game: Game }> = ({ game }) => {
  // TODO(burdon): Process game.
  const [chess, setChess] = useState(new Chess());
  useEffect(() => {
    if (chess.fen() !== game.fen) {
      setChess(new Chess(game.fen));
    }
  }, [chess.fen(), game.fen]);

  const makeMove = (move) => {
    const result = chess.move(move);
    if (result) {
      const newChess = new Chess(chess.fen());
      setChess(newChess);

      // TODO(burdon): Add move (requires array of scalars).
      game.fen = newChess.fen();
    }

    return result; // Null if illegal.
  };

  const handleDrop = (source: any, target: any, piece: any) => {
    const move = makeMove({ from: source, to: target }); // TODO(burdon): Auto-promote.
    if (!move) {
      return false;
    }

    return true;
  };

  // TODO(burdon): boardOrientation, boardWidth.
  // https://react-chessboard.com/?path=/story/example-chessboard--configurable-board
  return (
    <div>
      <ReactChessboard position={chess.fen()} onPieceDrop={handleDrop} {...props} />
    </div>
  );
};
