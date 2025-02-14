//
// Copyright 2025 DXOS.org
//

import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import React, { type PropsWithChildren, useCallback, useEffect, useState } from 'react';

import { log } from '@dxos/log';
import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { Container } from './Container';
import { BoardContext, type BoardContextType } from './context';
import { type BoardModel, isLocation, isPiece, type Move, type PieceRecord } from './types';

type RootProps = ThemedClassName<
  PropsWithChildren<{
    model?: BoardModel;
    onDrop?: (move: Move) => boolean;
  }>
>;

/**
 * Generic board container.
 */
const Root = ({ children, classNames, model, onDrop }: RootProps) => {
  const [dragging, setDragging] = useState(false);
  const [promoting, setPromoting] = useState<PieceRecord | undefined>();

  // Handle promotion.
  const onPromotion = useCallback<BoardContextType['onPromotion']>((move) => {
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
    <BoardContext.Provider value={{ model, dragging, promoting, onPromotion }}>
      <Container classNames={mx('aspect-square', classNames)}>{children}</Container>
    </BoardContext.Provider>
  );
};

Root.displayName = 'Board.Root';

export const Board = {
  Root,
};

export type { RootProps as BoardRootProps };
