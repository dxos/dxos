//
// Copyright 2023 DXOS.org
//

import { Chess, Color } from 'chess.js';
import { ArrowURightDown, Circle } from 'phosphor-react';
import React, { FC, useEffect, useState } from 'react';
import { Chessboard as ReactChessboard } from 'react-chessboard';

import { getSize, mx } from '@dxos/react-components';

import { customPieces, phosphorPieces, riohachaPieces } from './media';
import { Game } from './proto';

export enum ChessPieces {
  STANDARD = 0,
  CUSTOM = 1,
  FUTURE = 2,
  RIOHACHA = 3
}

const chessPieces = {
  [ChessPieces.STANDARD]: undefined,
  [ChessPieces.CUSTOM]: customPieces,
  [ChessPieces.FUTURE]: phosphorPieces,
  [ChessPieces.RIOHACHA]: riohachaPieces
};

const props = {
  customDarkSquareStyle: { backgroundColor: '#dcdcdc' },
  customLightSquareStyle: { backgroundColor: '#f5f5f5' }
};

export type ChessboardProps = {
  game?: Game; // TODO(burdon): Remove ECHO dependency; pass in model with subscription.
  readonly?: boolean;
  orientation?: Color;
  style?: ChessPieces;
  onUpdate?: (game: Chess) => void;
};

/**
 * https://www.npmjs.com/package/chess.js
 * https://www.npmjs.com/package/react-chessboard
 */
export const Chessboard: FC<ChessboardProps> = ({
  game,
  readonly = false,
  orientation = 'w',
  style = ChessPieces.STANDARD,
  onUpdate
}) => {
  const [chess, setChess] = useState(new Chess());
  const [, forceUpdate] = useState({});
  useEffect(() => {
    if (game.fen !== chess.fen()) {
      const newChess = new Chess(game.fen);
      setChess(newChess);
      onUpdate?.(newChess);
    }
  }, [game.fen]);

  const makeMove = (move) => {
    const result = chess.move(move);
    if (result) {
      // TODO(burdon): Add move (requires array of scalars).
      game.fen = chess.fen();
      onUpdate?.(chess);
      forceUpdate({});
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

  // TODO(burdon): Show captured pieces.
  // https://react-chessboard.com/?path=/story/example-chessboard--configurable-board
  return (
    <ReactChessboard
      position={chess.fen()}
      boardOrientation={orientation === 'w' ? 'white' : 'black'}
      arePiecesDraggable={!readonly}
      onPieceDrop={handleDrop}
      customPieces={chessPieces[style]}
      {...props}
    />
  );
};

export const ChessPanel = ({
  chess,
  orientation,
  onFlip
}: {
  chess: Chess;
  orientation: Color;
  onFlip: () => void;
}) => {
  const label = chess.isGameOver()
    ? chess.isCheckmate()
      ? 'CHECKMATE'
      : chess.isStalemate()
      ? 'STALEMATE'
      : 'DRAW'
    : chess.isCheck()
    ? 'CHECK'
    : '';

  const Player = ({ color }: { color: Color }) => {
    const turn = color === chess?.turn();

    return (
      <div className='flex items-center'>
        <Circle
          className={mx(getSize(4), turn && (chess.isCheckmate() ? 'text-red-500' : 'text-green-500'))}
          weight={turn ? 'fill' : 'thin'}
        />
      </div>
    );
  };

  return (
    <div className='flex flex-col bg-gray-50 shadow'>
      <div className='flex items-center justify-between pl-2 pr-2 border-b' style={{ height: 32 }}>
        <Player color={orientation === 'w' ? 'b' : 'w'} />
        <button onClick={onFlip}>
          <ArrowURightDown weight='thin' className={getSize(6)} />
        </button>
      </div>

      <div className='flex flex-col justify-center pl-2 font-thin' style={{ height: 40 }}>
        {label}
      </div>

      <div className='flex items-center justify-between pl-2 pr-2 border-t' style={{ height: 32 }}>
        <Player color={orientation} />
      </div>
    </div>
  );
};
