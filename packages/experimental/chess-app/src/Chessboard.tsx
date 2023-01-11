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

export type ChessboardProps = {
  game: Game;
  readonly?: boolean;
  orientation?: 'white' | 'black';
  onUpdate?: (game: Chess) => void;
  onSelect?: () => void;
};

/**
 * https://www.npmjs.com/package/chess.js
 * https://www.npmjs.com/package/react-chessboard
 */
export const Chessboard: FC<ChessboardProps> = ({
  game,
  readonly = false,
  orientation = 'white',
  onUpdate,
  onSelect
}) => {
  const [chess, setChess] = useState(new Chess());
  useEffect(() => {
    if (chess.fen() !== game.fen) {
      const newChess = new Chess(game.fen);
      setChess(newChess);
      onUpdate?.(newChess);
    } else {
      onUpdate?.(chess);
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
    // TODO(burdon): Select promotion piece.
    const promotion =
      piece[1] === 'P' && ((piece[0] === 'w' && target[1] === '8') || (piece[0] === 'b' && target[1] === '1'))
        ? 'q'
        : undefined;
    const move = makeMove({ from: source, to: target, promotion });
    return !!move;
  };

  const handleSelect = () => {
    onSelect?.();
  };

  // https://react-chessboard.com/?path=/story/example-chessboard--configurable-board
  return (
    <div className='select-none' onClick={handleSelect}>
      <ReactChessboard
        position={chess.fen()}
        boardOrientation={orientation}
        arePiecesDraggable={!readonly}
        onPieceDrop={handleDrop}
        customSquareStyles={{ e1: { color: 'red' }, e8: { color: 'red' } }}
        {...props}
      />
    </div>
  );
};
