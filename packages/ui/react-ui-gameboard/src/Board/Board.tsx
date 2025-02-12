//
// Copyright 2025 DXOS.org
//

import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import React, { forwardRef, type PropsWithChildren, useEffect, useState } from 'react';

import { log } from '@dxos/log';

import { BoardContext } from './context';
import { isLocation, isPiece, type Side, type Move, type PieceRecordMap } from './types';
import { Chessboard } from '../Chessboard';

export type BoardProps = {
  orientation?: Side;
  pieces?: PieceRecordMap;
  showLabels?: boolean;
  isValidMove?: (move: Move) => boolean;
  onDrop?: (move: Move) => boolean;
};

/**
 * Generic board container.
 */
export const Board = ({ onDrop, ...props }: BoardProps) => {
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
    <BoardContext.Provider value={{ dragging }}>
      <Container>
        <Chessboard {...props} />
      </Container>
    </BoardContext.Provider>
  );
};

/**
 * Container centers the board.
 */
const Container = forwardRef<HTMLDivElement, PropsWithChildren>(({ children }, forwardedRef) => {
  return (
    <div ref={forwardedRef} className='flex w-full h-full justify-center overflow-hidden'>
      <div className='max-w-full max-h-full aspect-square content-center'>{children}</div>
    </div>
  );
});
