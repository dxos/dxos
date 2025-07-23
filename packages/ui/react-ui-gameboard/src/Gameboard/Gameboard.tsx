//
// Copyright 2025 DXOS.org
//

import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import React, { type CSSProperties, forwardRef, type PropsWithChildren, useCallback, useEffect, useState } from 'react';

import { log } from '@dxos/log';
import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { GameboardContext, type GameboardContextType } from './context';
import { type GameboardModel, isLocation, isPiece, type Move, type PieceRecord } from './types';

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

type GameboardContentsProps = ThemedClassName<
  PropsWithChildren<{
    style?: CSSProperties;
  }>
>;

/**
 * Container centers the board.
 */
const GameboardContent = forwardRef<HTMLDivElement, GameboardContentsProps>(
  ({ children, classNames, style }, forwardedRef) => {
    return (
      <div ref={forwardedRef} style={style} className='flex w-full h-full justify-center overflow-hidden'>
        <div className={mx('max-w-full max-h-full content-center aspect-square', classNames)}>{children}</div>
      </div>
    );
  },
);

export const Gameboard = {
  Root: GameboardRoot,
  Content: GameboardContent,
};

export type { GameboardRootProps, GameboardContentsProps };
