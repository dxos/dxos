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
  Chessboard as NaturalChessboard,
  type ChessboardProps as NaturalChessboardProps,
  getRawPgn,
  useGameboardContext,
} from '@dxos/react-ui-gameboard';
import { useSoundEffect } from '@dxos/react-ui-sfx';
import { mx } from '@dxos/ui-theme';

import { type Chess } from '../types';

import { Info, type InfoProps } from './Info';

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

type RootProps = PropsWithChildren<{
  game: Chess.Game;
}>;

const Root = forwardRef<ChessboardController, RootProps>(({ game, children }, forwardedRef) => {
  const model = useMemo(() => new ExtendedChessModel(game), []);
  const click = useSoundEffect('Click');

  // Controller.
  useImperativeHandle(forwardedRef, () => {
    return {
      setMoveNumber: (index) => model.setMoveIndex(index),
    };
  }, [model]);

  // External change.
  // NOTE: Warning if user has not interacted with the board.
  useEffect(() => {
    if (model.pgn !== getRawPgn(game.pgn ?? '')) {
      const silent = model.pgn === '*';
      model.update(game.pgn);
      if (!silent) {
        void click.play();
      }
    }
  }, [game.pgn]);

  // Move.
  const handleDrop = useCallback<NonNullable<GameboardRootProps<ChessModel>['onDrop']>>(
    (move) => {
      if (!model.makeMove(move)) {
        return false;
      }

      void click.play();
      game.pgn = model.pgn;
      return true;
    },
    [model],
  );

  return (
    <Gameboard.Root model={model} onDrop={handleDrop}>
      {children}
    </Gameboard.Root>
  );
});

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
// Board
//

type BoardProps = NaturalChessboardProps;

const Board = (props: BoardProps) => {
  const { model } = useGameboardContext<ChessModel>(Board.displayName);

  // Keyboard navigation.
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) {
      return;
    }

    // Participate in keyboard navigation (set tabIndex={0})
    ref.current.setAttribute('data-arrow-keys', 'all');

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

  return <NaturalChessboard ref={ref} {...props} />;
};

Board.displayName = 'Chessboard.Board';

//
// Chessboard
//

export const Chessboard = {
  Root: Root,
  Content: Content,
  Board: Board,
  Info: Info,
};

export type {
  RootProps as ChessboardRootProps,
  ContentProps as ChessboardContentProps,
  BoardProps as ChessboardBoardProps,
  InfoProps as ChessboardInfoProps,
};
