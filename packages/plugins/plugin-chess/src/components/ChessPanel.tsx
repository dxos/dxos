//
// Copyright 2023 DXOS.org
//

import { ArrowURightDown, Circle } from '@phosphor-icons/react';
import { type Color } from 'chess.js';
import React, { type FC } from 'react';

import { type ChessModel } from '@dxos/react-ui-gameboard';
import { getSize, mx } from '@dxos/react-ui-theme';

export type ChessPanelProps = {
  model: ChessModel;
  orientation?: Color;
  onFlip?: () => void;
};

export const ChessPanel: FC<ChessPanelProps> = ({ model: { game }, orientation = 'w', onFlip }) => {
  const history = game.history();
  const label = game.isGameOver()
    ? game.isCheckmate()
      ? 'CHECKMATE'
      : game.isStalemate()
        ? 'STALEMATE'
        : 'DRAW'
    : game.isCheck()
      ? 'CHECK'
      : history.length
        ? `Move ${history.length}`
        : '';

  const Player = ({ color }: { color: Color }) => {
    const turn = color === game.turn();

    return (
      <div className='flex items-center'>
        <Circle
          className={mx(getSize(4), turn && (game.isCheckmate() ? 'text-red-500' : 'text-green-500'))}
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
