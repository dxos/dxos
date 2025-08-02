//
// Copyright 2025 DXOS.org
//

import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import React, { forwardRef, type PropsWithChildren, useCallback, useEffect, useState } from 'react';

import { log } from '@dxos/log';
import { type ThemedClassName } from '@dxos/react-ui';

import { GameboardContext, type GameboardContextType } from './context';
import { type GameboardModel, isLocation, isPiece, type Move, type PieceRecord } from './types';
import { mx } from '@dxos/react-ui-theme';

type GameboardRootProps = PropsWithChildren<{
  model?: GameboardModel;
  onDrop?: (move: Move) => boolean;
}>;

/**
 * Generic board container.
 */
const GameboardRoot = ({ children, model, onDrop }: GameboardRootProps) => {
  const [dragging, setDragging] = useState(false);
  const [promoting, setPromoting] = useState<PieceRecord | undefined>();

  // Handle promotion.
  const onPromotion = useCallback<GameboardContextType['onPromotion']>((move) => {
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
        if (model.canPromote?.(move)) {
          setPromoting({ ...piece, location: targetLocation });
        } else {
          onDrop?.(move);
        }

        setDragging(false);
      },
    });
  }, [model]);

  return (
    <GameboardContext.Provider value={{ model, dragging, promoting, onPromotion }}>
      {children}
    </GameboardContext.Provider>
  );
};

GameboardRoot.displayName = 'Gameboard.Root';

type GameboardContentProps = ThemedClassName<PropsWithChildren<{ grow?: boolean; contain?: boolean }>>;

const GameboardContent = forwardRef<HTMLDivElement, GameboardContentProps>(
  ({ children, classNames, grow, contain }, forwardedRef) => {
    return (
      <div
        ref={forwardedRef}
        role='none'
        className={mx(grow && 'grid is-full bs-full size-container place-content-center', classNames)}
      >
        {contain ? <div className='is-[min(100cqw,100cqh)] bs-[min(100cqw,100cqh)]'>{children}</div> : children}
      </div>
    );
  },
);

export const Gameboard = {
  Root: GameboardRoot,
  Content: GameboardContent,
};

export type { GameboardRootProps, GameboardContentProps };
