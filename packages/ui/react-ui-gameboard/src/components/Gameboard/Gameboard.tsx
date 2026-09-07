//
// Copyright 2025 DXOS.org
//

import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import React, { type PropsWithChildren, forwardRef, useCallback, useEffect, useState } from 'react';

import { log } from '@dxos/log';
import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { GameboardContextProvider, type GameboardContextValue } from './GameboardContext';
import { Piece, type PieceProps } from './Piece';
import { Square, type SquareProps } from './Square';
import { type GameboardModel, type Move, type PieceRecord, isLocation, isPiece } from './types';

//
// Root
//

type GameboardRootProps<M extends GameboardModel<any>> = PropsWithChildren<{
  model?: M;
  onDrop?: (move: Move) => boolean;
}>;

/**
 * Generic board container.
 */
const GameboardRoot = <M extends GameboardModel<any>>({ children, model, onDrop }: GameboardRootProps<M>) => {
  const [dragging, setDragging] = useState(false);
  const [promoting, setPromoting] = useState<PieceRecord | undefined>();

  const handlePromotion = useCallback<GameboardContextValue<GameboardModel<any>>['onPromotion']>((move) => {
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
  ({ children, classNames, grow, contain }, forwardedRef) => {
    return (
      <div
        className={mx(grow && 'dx-container-type-size dx-expand grid place-content-center', classNames)}
        ref={forwardedRef}
      >
        {contain ? <div className='w-[min(100cqw,100cqh)] h-[min(100cqw,100cqh)]'>{children}</div> : children}
      </div>
    );
  },
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

export type {
  GameboardContentProps,
  PieceProps as GameboardPieceProps,
  GameboardRootProps,
  SquareProps as GameboardSquareProps,
};
