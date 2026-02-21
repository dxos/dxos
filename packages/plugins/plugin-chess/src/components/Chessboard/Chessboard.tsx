//
// Copyright 2024 DXOS.org
//

import { RegistryContext } from '@effect-atom/atom-react';
import React, {
  type PropsWithChildren,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';

import { addEventListener } from '@dxos/async';
import { Obj } from '@dxos/echo';
import { type ThemedClassName } from '@dxos/react-ui';
import {
  type ChessModel,
  Gameboard,
  type GameboardRootProps,
  Chessboard as NaturalChessboard,
  type ChessboardProps as NaturalChessboardProps,
  getRawPgn,
  useGameboardContext,
} from '@dxos/react-ui-gameboard';
import { useSoundEffect } from '@dxos/react-ui-sfx';
import { mx } from '@dxos/ui-theme';

import { type Chess } from '../../types';

import { Info, type InfoProps } from './Info';
import { ExtendedChessModel } from './types';

export interface ChessboardController {
  setMoveNumber(index: number): void;
}

//
// Root
//

type RootProps = PropsWithChildren<{
  game: Chess.Game;
}>;

const Root = forwardRef<ChessboardController, RootProps>(({ game, children }, forwardedRef) => {
  const registry = useContext(RegistryContext);
  const model = useMemo(() => new ExtendedChessModel(registry, game), [registry]);
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
      Obj.change(game, (game) => {
        game.pgn = model.pgn;
      });
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

type Role = 'card--content';

type ContentProps = ThemedClassName<PropsWithChildren<{ role?: Role }>>;

const Content = ({ classNames, children, role }: ContentProps) => {
  return (
    <Gameboard.Content
      classNames={mx(
        classNames,
        role === 'card--content' ? 'size-container card-square' : 'flex flex-col justify-center',
      )}
    >
      {children}
    </Gameboard.Content>
  );
};

//
// Board
//

const BOARD_NAME = 'Chessboard.Board';

type BoardProps = NaturalChessboardProps;

const Board = (props: BoardProps) => {
  const registry = useContext(RegistryContext);
  const { model } = useGameboardContext<ChessModel>(BOARD_NAME);

  // Keyboard navigation.
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) {
      return;
    }

    // Participate in keyboard navigation (set tabIndex={0})
    ref.current.setAttribute('data-arrow-keys', 'all');

    return addEventListener(ref.current, 'keydown', (ev) => {
      const moveIndex = registry.get(model.moveIndex);
      switch (ev.key) {
        case 'ArrowUp':
          model.setMoveIndex(0);
          break;
        case 'ArrowDown':
          model.setMoveIndex(model.game.history().length);
          break;
        case 'ArrowLeft':
          if (moveIndex > 0) {
            model.setMoveIndex(moveIndex - 1);
          }
          break;
        case 'ArrowRight':
          if (moveIndex < model.game.history().length) {
            model.setMoveIndex(moveIndex + 1);
          }
          break;
      }
    });
  }, [registry, model]);

  return <NaturalChessboard {...props} ref={ref} />;
};

Board.displayName = BOARD_NAME;

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
