//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { Chess } from './Chess';
import { type ChessType } from '../types';

export const ChessPanel = ({ game, role }: { game: ChessType; role?: string }) => {
  switch (role) {
    case 'card--popover': {
      return (
        <Chess.Root game={game}>
          <Chess.Content classNames='size-container popover-square' contain>
            <Chess.Board />
          </Chess.Content>
        </Chess.Root>
      );
    }

    case 'card--intrinsic': {
      return (
        <Chess.Root game={game}>
          <Chess.Content>
            <Chess.Board />
          </Chess.Content>
        </Chess.Root>
      );
    }

    case 'card--extrinsic':
    default: {
      return (
        <Chess.Root game={game}>
          <Chess.Content grow contain>
            <Chess.Board />
          </Chess.Content>
        </Chess.Root>
      );
    }
  }
};
