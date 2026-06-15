//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { Obj } from '@dxos/echo';
import { type GameVariantSurfaceProps } from '@dxos/plugin-game/types';

import { Chessboard } from '#components';
import { Chess } from '#types';

export type ChessCardProps = GameVariantSurfaceProps;

export const ChessCard = ({ variant }: ChessCardProps) => {
  if (!Obj.instanceOf(Chess.State, variant)) {
    return null;
  }

  return (
    <Chessboard.Root state={variant}>
      <Chessboard.Content>
        <Chessboard.Board />
      </Chessboard.Content>
    </Chessboard.Root>
  );
};
