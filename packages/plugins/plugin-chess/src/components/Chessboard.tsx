//
// Copyright 2024 DXOS.org
//

import React, { type PropsWithChildren, useCallback, useEffect, useMemo } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import {
  ChessModel,
  Gameboard,
  type GameboardRootProps,
  Chessboard as NativeChessboard,
  type ChessboardProps as NativeChessboardProps,
} from '@dxos/react-ui-gameboard';
import { mx } from '@dxos/react-ui-theme';

import { type Chess } from '../types';

import { ChessboardInfo, type ChessboardInfoProps } from './ChessboardInfo';
import { ChessboardPlayers, type ChessboardPlayersProps } from './ChessboardPlayers';

export class ExtendedChessModel extends ChessModel {
  constructor(readonly object: Chess.Game) {
    super();
  }
}

//
// Root
//

type ChessboardRootProps = PropsWithChildren<{
  game: Chess.Game;
}>;

const ChessboardRoot = ({ game, children }: ChessboardRootProps) => {
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

type ChessboardContentProps = ThemedClassName<PropsWithChildren<{ role?: Role }>>;

const ChessboardContent = ({ classNames, children, role }: ChessboardContentProps) => {
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
  Root: ChessboardRoot,
  Content: ChessboardContent,
  Board: NativeChessboard,
  Info: ChessboardInfo,
  Players: ChessboardPlayers,
};

export type {
  ChessboardRootProps,
  ChessboardContentProps,
  NativeChessboardProps as ChessboardBoardProps,
  ChessboardInfoProps,
  ChessboardPlayersProps,
};
