//
// Copyright 2024 DXOS.org
//

import React, { type PropsWithChildren, useCallback, useEffect, useMemo } from 'react';

import {
  ChessModel,
  Gameboard,
  type GameboardRootProps,
  Chessboard as NativeChessboard,
} from '@dxos/react-ui-gameboard';

import { type Chess } from '../types';
import { ChessInfo } from './ChessInfo';
import { ChessPlayers } from './ChessPlayers';
import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

export class ExtendedChessModel extends ChessModel {
  constructor(readonly object: Chess.Game) {
    super();
  }
}

//
// Root
//

type RootProps = PropsWithChildren<{
  game: Chess.Game;
}>;

const Root = ({ game, children }: RootProps) => {
  const model = useMemo(() => new ExtendedChessModel(game), []);
  useEffect(() => {
    model.initialize(game.pgn);
  }, [game.pgn]);

  const handleDrop = useCallback<NonNullable<GameboardRootProps<ChessModel>['onDrop']>>(
    (move) => {
      if (model.makeMove(move)) {
        game.pgn = model.pgn;
        return true;
      }

      return false;
    },
    [model],
  );

  return (
    <Gameboard.Root model={model} onDrop={handleDrop}>
      {children}
    </Gameboard.Root>
  );
};

//
// Content
//

type Role = 'card--popover' | 'card--intrinsic' | 'card--extrinsic';

type ContentProps = ThemedClassName<PropsWithChildren<{ role?: Role }>>;

const Content = ({ classNames, children, role }: ContentProps) => {
  return (
    <Gameboard.Content
      classNames={mx(classNames, role === 'card--popover' && 'size-container popover-square')}
      grow={!role || role === 'card--extrinsic'}
      contain={!role || role === 'card--extrinsic' || role === 'card--popover'}
    >
      {children}
    </Gameboard.Content>
  );
};

//
// Chessboard
//

export const Chessboard = {
  Root,
  Content,
  Board: NativeChessboard,
  Info: ChessInfo,
  Players: ChessPlayers,
};

export type { RootProps as ChessRootProps };
