//
// Copyright 2024 DXOS.org
//

import React, {
  type PropsWithChildren,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';

import { addEventListener } from '@dxos/async';
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

export interface ChessboardController {
  setMoveNumber(index: number): void;
}

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

const ChessboardRoot = forwardRef<ChessboardController, ChessboardRootProps>(({ game, children }, forwardedRef) => {
  const model = useMemo(() => new ExtendedChessModel(game), []);

  // Controller.
  useImperativeHandle(forwardedRef, () => {
    return {
      setMoveNumber: (index) => model.setMoveIndex(index),
    };
  }, [model]);

  // External change.
  useEffect(() => {
    model.update(game.pgn);
  }, [game.pgn]);

  // Keyboard navigation.
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) {
      return;
    }

    return addEventListener(ref.current, 'keydown', (ev) => {
      switch (ev.key) {
        case 'ArrowUp':
          model.setMoveIndex(0);
          break;
        case 'ArrowDown':
          model.setMoveIndex(model.game.history().length);
          break;
        case 'ArrowLeft':
          if (model.moveIndex.value > 0) {
            model.setMoveIndex(model.moveIndex.value - 1);
          }
          break;
        case 'ArrowRight':
          if (model.moveIndex.value < model.game.history().length) {
            model.setMoveIndex(model.moveIndex.value + 1);
          }
          break;
      }
    });
  }, [model]);

  // Move.
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
      <div ref={ref} role='none' tabIndex={0} className='grid grow outline-none'>
        {children}
      </div>
    </Gameboard.Root>
  );
});

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
