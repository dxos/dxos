//
// Copyright 2025 DXOS.org
//

import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { createContext } from '@radix-ui/react-context';
import React, { type PropsWithChildren, forwardRef, useCallback, useEffect, useState } from 'react';

import { log } from '@dxos/log';
import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { Piece, type PieceProps } from './Piece';
import { Square, type SquareProps } from './Square';
import { type GameboardModel, type Move, type PieceRecord, isLocation, isPiece } from './types';

export type GameboardContextValue<M extends GameboardModel> = {
  model: M;
  dragging?: boolean; // TODO(burdon): Change to PieceRecord.
  promoting?: PieceRecord;
  onPromotion: (move: Move) => void;
};

const [GameboardContextProvider, useRadixGameboardContext] = createContext<GameboardContextValue<any>>('Gameboard');

const useGameboardContext = <M extends GameboardModel>(consumerName: string): GameboardContextValue<M> =>
  useRadixGameboardContext(consumerName);

//
// Root
//

type GameboardRootProps<M extends GameboardModel> = PropsWithChildren<{
  model?: M;
  moveNumber?: number;
  onDrop?: (move: Move) => boolean;
}>;

/**
 * Generic board container.
 */
const GameboardRoot = <M extends GameboardModel>({ children, model, moveNumber, onDrop }: GameboardRootProps<M>) => {
  const [dragging, setDragging] = useState(false);
  const [promoting, setPromoting] = useState<PieceRecord | undefined>();

  const handlePromotion = useCallback<GameboardContextValue<M>['onPromotion']>((move) => {
    log('onPromotion', { move });
    setPromoting(undefined);
    onDrop?.(move);
  }, []);

  useEffect(() => {
    if (!model) {
      return;
    }

    // TODO(burdon): Should target specific container.
    return monitorForElements({
      onDragStart: ({ source }) => {
        log('onDragStart', { source });
        setDragging(true);
      },
      onDrop: ({ source, location }) => {
        log('onDrop', { source, location });
        const target = location.current.dropTargets[0];
        if (!target) {
          return;
        }

        const targetLocation = target.data.location;
        const piece = source.data.piece;
        if (!isLocation(targetLocation) || !isPiece(piece)) {
          return;
        }

        const move: Move = { from: piece.location, to: targetLocation, piece: piece.type };
        if (model.isValidMove(move)) {
          if (model.canPromote?.(move)) {
            setPromoting({ ...piece, location: targetLocation });
          } else {
            onDrop?.(move);
          }
        }

        setDragging(false);
      },
    });
  }, [model]);

  return (
    <GameboardContextProvider model={model} dragging={dragging} promoting={promoting} onPromotion={handlePromotion}>
      {children}
    </GameboardContextProvider>
  );
};

GameboardRoot.displayName = 'Gameboard.Root';

//
// Content
//

type GameboardContentProps = ThemedClassName<PropsWithChildren<{ grow?: boolean; contain?: boolean }>>;

const GameboardContent = forwardRef<HTMLDivElement, GameboardContentProps>(
  ({ children, classNames, grow, contain }, forwardedRef) => (
    <div
      role='none'
      className={mx(grow && 'grid is-full bs-full size-container place-content-center', classNames)}
      ref={forwardedRef}
    >
      {contain ? <div className='is-[min(100cqw,100cqh)] bs-[min(100cqw,100cqh)]'>{children}</div> : children}
    </div>
  ),
);

GameboardContent.displayName = 'Gameboard.Content';

//
// Gameboard
//

export const Gameboard = {
  Root: GameboardRoot,
  Content: GameboardContent,
  Piece,
  Square,
};

export { useGameboardContext };

export type {
  GameboardRootProps,
  GameboardContentProps,
  PieceProps as GameboardPieceProps,
  SquareProps as GameboardSquareProps,
};
