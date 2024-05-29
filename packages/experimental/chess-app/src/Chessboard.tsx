//
// Copyright 2023 DXOS.org
//

import { ArrowURightDown, Circle } from '@phosphor-icons/react';
import { Chess, type Color } from 'chess.js';
import React, { type FC } from 'react';
import { Chessboard as ReactChessboard } from 'react-chessboard';

import { getSize, mx } from '@dxos/react-ui-theme';

import { customPieces, phosphorPieces, riohachaPieces } from './media';

export enum ChessPieces {
  STANDARD = 0,
  CUSTOM = 1,
  FUTURE = 2,
  RIOHACHA = 3,
}

const chessPieces = {
  [ChessPieces.STANDARD]: undefined,
  [ChessPieces.CUSTOM]: customPieces,
  [ChessPieces.FUTURE]: phosphorPieces,
  [ChessPieces.RIOHACHA]: riohachaPieces,
};

// TODO(burdon): Replace with classes.
const props = {
  customDarkSquareStyle: { backgroundColor: '#CCD3DB' },
  customLightSquareStyle: { backgroundColor: '#6C95B9' },
  customDropSquareStyle: { boxShadow: 'inset 0 0 1px 2px black' },
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
  pieces?: ChessPieces;
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
  pieces = ChessPieces.STANDARD,
  onUpdate,
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
    } else {
      return false;
    }
  };

  // https://react-chessboard.com/?path=/story/example-chessboard--configurable-board
  return (
    // NOTE: Hack to force component to render (since requires inherent size).
    <ReactChessboard
      position={chess.fen()}
      boardOrientation={orientation === 'w' ? 'white' : 'black'}
      arePiecesDraggable={!readonly}
      onPieceDrop={handleDrop}
      customPieces={chessPieces[pieces]}
      {...props}
    />
  );
};

export const ChessPanel: FC<{
  model: ChessModel;
  orientation?: Color;
  onFlip?: () => void;
}> = ({ model: { chess }, orientation = 'w', onFlip }) => {
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
    <div className='flex flex-col'>
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
