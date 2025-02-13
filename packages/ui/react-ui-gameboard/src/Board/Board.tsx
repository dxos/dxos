//
// Copyright 2025 DXOS.org
//

import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import React, { type PropsWithChildren, useEffect, useState } from 'react';

import { log } from '@dxos/log';
import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { Container } from './Container';
import { BoardContext } from './context';
import { type BoardModel, isLocation, isPiece, type Move } from './types';

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

  useEffect(() => {
    // TODO(burdon): Should target specific container.
    log.info('monitorForElements');
    return monitorForElements({
      onDragStart: ({ source }) => {
        log.info('onDragStart', { source });
        setDragging(true);
      },
      onDrop: ({ source, location }) => {
        log.info('onDrop', { source, location });
        const target = location.current.dropTargets[0];
        if (!target) {
          return;
        }

        const targetLocation = target.data.location;
        const piece = source.data.piece;
        if (!isLocation(targetLocation) || !isPiece(piece)) {
          return;
        }

        onDrop?.({ source: piece.location, target: targetLocation, piece: piece.type });
        setDragging(false);
      },
    });
  }, []);

  return (
    <BoardContext.Provider value={{ model, dragging }}>
      <Container classNames={mx('aspect-square', classNames)}>{children}</Container>
    </BoardContext.Provider>
  );
};

Root.displayName = 'Board.Root';

export const Board = {
  Root,
};

export type { RootProps as BoardRootProps };
