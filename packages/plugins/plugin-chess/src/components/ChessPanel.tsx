//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { Chess } from './Chess';
import { type ChessType } from '../types';

// TODO(burdon): Factor out variance into useful container?
export const ChessPanel = ({ game, role }: { game: ChessType; role?: string }) => {
  switch (role) {
    case 'card--extrinsic': {
      return (
        <Chess.Root game={game}>
          <Chess.Content classNames='grid is-full bs-full size-container place-content-center' contain>
            <Chess.Board />
          </Chess.Content>
        </Chess.Root>
      );
    }

    case 'card--popover': {
      return (
        <Chess.Root game={game}>
          <Chess.Content classNames='size-container popover-square' contain>
            <Chess.Board />
          </Chess.Content>
        </Chess.Root>
      );
    }

    case 'card--intrinsic':
    default: {
      return (
        <Chess.Root game={game}>
          <Chess.Content>
            <Chess.Board />
          </Chess.Content>
        </Chess.Root>
      );
    }
  }
};
