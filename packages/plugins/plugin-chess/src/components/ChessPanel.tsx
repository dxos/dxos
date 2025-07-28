//
// Copyright 2023 DXOS.org
//

import { type Color } from 'chess.js';
import React, { type FC } from 'react';

import { type ThemedClassName, Icon } from '@dxos/react-ui';
import { type ChessModel } from '@dxos/react-ui-gameboard';
import { mx } from '@dxos/react-ui-theme';

export type ChessPanelProps = ThemedClassName<{
  model: ChessModel;
  orientation?: Color;
  onFlip?: () => void;
}>;

export const ChessPanel: FC<ChessPanelProps> = ({ classNames, model, orientation = 'w', onFlip }) => {
  const game = model.game;
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
        <Icon
          icon={turn ? 'ph--circle--fill' : 'ph--circle--thin'}
          size={4}
          className={mx(turn && (game.isCheckmate() ? 'text-red-500' : 'text-green-500'))}
        />
      </div>
    );
  };

  return (
    <div className={mx('flex flex-col', classNames)}>
      <div className='flex items-center justify-between pl-2 pr-2 border-b' style={{ height: 32 }}>
        <Player color={orientation === 'w' ? 'b' : 'w'} />
        {onFlip && (
          <button onClick={onFlip}>
            <Icon icon='ph--arrow-u-right-down--thin' size={6} />
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
