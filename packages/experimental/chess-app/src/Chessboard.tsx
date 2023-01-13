//
// Copyright 2023 DXOS.org
//

import { Chess, Color } from 'chess.js';
import { ArrowURightDown, Circle } from 'phosphor-react';
import React, { FC } from 'react';
import { Chessboard as ReactChessboard } from 'react-chessboard';

import { getSize, mx } from '@dxos/react-components';

import { customPieces, phosphorPieces, riohachaPieces } from './media';

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

export type ChessModel = {
  chess: Chess;
};

export type ChessMove = {
  from: string;
  to: string;
  promotion?: string;
};

export type ChessboardProps = {
  model: ChessModel;
  orientation?: Color;
  readonly?: boolean;
  style?: ChessPieces;
  onUpdate?: (move: ChessMove) => void;
};

/**
 * https://www.npmjs.com/package/chess.js
 * https://www.npmjs.com/package/react-chessboard
 */
export const Chessboard: FC<ChessboardProps> = ({
  model: { chess },
  orientation = 'w',
  readonly = false,
  style = ChessPieces.STANDARD,
  onUpdate
}) => {
  const handleDrop = (source: any, target: any, piece: any) => {
    // TODO(burdon): Select promotion piece.
    const promotion =
      piece[1] === 'P' && ((piece[0] === 'w' && target[1] === '8') || (piece[0] === 'b' && target[1] === '1'))
        ? 'q'
        : undefined;

    const move = { from: source, to: target, promotion };
    const result = new Chess(chess.fen()).move(move);
    if (result) {
      onUpdate?.(move);
      return true;
    }
  };

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

export const ChessPanel: FC<{
  model: ChessModel;
  orientation: Color;
  onFlip: () => void;
}> = ({ model: { chess }, orientation, onFlip }) => {
  const history = chess.history();
  const label = chess.isGameOver()
    ? chess.isCheckmate()
      ? 'CHECKMATE'
      : chess.isStalemate()
      ? 'STALEMATE'
      : 'DRAW'
    : chess.isCheck()
    ? 'CHECK'
    : history.length
    ? `Move ${history.length}`
    : '';

  const Player = ({ color }: { color: Color }) => {
    const turn = color === chess.turn();

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
        {onFlip && (
          <button onClick={onFlip}>
            <ArrowURightDown weight='thin' className={getSize(6)} />
          </button>
        )}
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
