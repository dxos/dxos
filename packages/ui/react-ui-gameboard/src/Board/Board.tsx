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
        const sourceLocation = source.data.location;
        const pieceType = source.data.pieceType;
        if (!isLocation(targetLocation) || !isLocation(sourceLocation) || !isPiece(pieceType)) {
          return;
        }

        onDrop?.({ source: sourceLocation, target: targetLocation, piece: pieceType });
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
