//
// Copyright 2023 DXOS.org
//

import { ArrowURightDown, Circle } from '@phosphor-icons/react';
import { Chess, type Color } from 'chess.js';
import React, { useRef, type FC } from 'react';
import { ChessboardDnDProvider, Chessboard as ReactChessboard } from 'react-chessboard';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useResizeDetector } from 'react-resize-detector';

import { getSize, mx } from '@dxos/react-ui-theme';

import { customPieces, phosphorPieces, riohachaPieces } from './pieces';

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
  customDropSquareStyle: { boxShadow: 'inset 0 0 1px 2px black' },
};

export type BoardStyle = 'default' | 'blue' | 'dark';

export const boardStyles: Record<BoardStyle, any> = {
  default: {
    customDarkSquareStyle: { backgroundColor: '#AE8A68' },
    customLightSquareStyle: { backgroundColor: '#f0d9b5' },
  },
  blue: {
    customDarkSquareStyle: { backgroundColor: '#CCD3DB' },
    customLightSquareStyle: { backgroundColor: '#6C95B9' },
  },
  dark: {
    customDarkSquareStyle: { backgroundColor: '#555' },
    customLightSquareStyle: { backgroundColor: '#888' },
  },
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
  boardStyle?: BoardStyle;
  pieces?: ChessPieces;
  onUpdate?: (move: ChessMove) => void;
};

/**
 * https://github.com/jhlywa/chess.js
 * https://react-chessboard.com/?path=/story/example-chessboard--configurable-board
 */
export const Chessboard = ({
  model: { chess },
  orientation = 'w',
  readonly = false,
  boardStyle = 'blue',
  pieces = ChessPieces.STANDARD,
  onUpdate,
}: ChessboardProps) => {
  const chessRoot = useRef<HTMLDivElement>(null);
  const { ref, width, height } = useResizeDetector();
  const style = boardStyles[boardStyle];

  const handleDrop = (source: any, target: any, piece: any) => {
    try {
      // Promotion piece will be selected by popup.
      const move = { from: source, to: target, promotion: piece.toLowerCase()[1] };
      const state = new Chess(chess.fen());
      const result = state.move(move);
      if (result) {
        onUpdate?.(move);
        return true;
      } else {
        return false;
      }
    } catch (err) {
      return false;
    }
  };

  return (
    <div ref={ref} className='flex w-full h-full justify-center items-center'>
      <div
        className='flex w-full justify-center'
        style={{ width: width && height ? Math.min(width, height) : undefined }}
      >
        <div ref={chessRoot} className='w-full relative' style={{ transform: 'translate3d(0, 0, 0)' }}>
          {/* TODO(burdon): Prevents interference with external DND, but drag position is broken. Fix for touch also. */}
          <ChessboardDnDProvider debugMode={true} backend={HTML5Backend} options={{ rootElement: chessRoot.current }}>
            <ReactChessboard
              boardWidth={width && height ? Math.min(width, height) : undefined}
              boardOrientation={orientation === 'w' ? 'white' : 'black'}
              allowDragOutsideBoard={false}
              arePiecesDraggable={!readonly}
              customPieces={chessPieces[pieces]}
              position={chess.fen()}
              onPieceDrop={handleDrop}
              {...style}
              {...props}
            />
          </ChessboardDnDProvider>
        </div>
      </div>
    </div>
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
