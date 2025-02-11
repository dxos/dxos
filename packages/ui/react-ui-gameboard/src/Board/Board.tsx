//
// Copyright 2025 DXOS.org
//

import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import React, { forwardRef, type PropsWithChildren, useEffect, useState } from 'react';

import { type PieceRecord, isLocation, isEqualLocation, canMove, isPiece } from './types';
import { Chessboard } from '../Chessboard';

export type BoardProps = {
  pieces?: PieceRecord[];
  orientation?: 'white' | 'black'; // TODO(burdon): Flip.
};

export const Board = ({ pieces: _pieces }: BoardProps) => {
  const [pieces, setPieces] = useState<PieceRecord[]>(_pieces ?? []);
  useEffect(() => {
    return monitorForElements({
      onDrop: ({ source, location }) => {
        const destination = location.current.dropTargets[0];
        if (!destination) {
          return;
        }

        const destinationLocation = destination.data.location;
        const sourceLocation = source.data.location;
        const pieceType = source.data.pieceType;
        if (!isLocation(destinationLocation) || !isLocation(sourceLocation) || !isPiece(pieceType)) {
          return;
        }

        const piece = pieces.find((p) => isEqualLocation(p.location, sourceLocation));
        const restOfPieces = pieces.filter((p) => p !== piece);
        if (canMove(sourceLocation, destinationLocation, pieceType, pieces) && piece !== undefined) {
          setPieces([{ type: piece.type, location: destinationLocation }, ...restOfPieces]);
        }
      },
    });
  }, [pieces]);

  return (
    <Container>
      <Chessboard pieces={pieces} />
    </Container>
  );
};

/**
 * Container centers the board.
 */
const Container = forwardRef<HTMLDivElement, PropsWithChildren>(({ children }, forwardedRef) => {
  return (
    <div ref={forwardedRef} className='relative w-full h-full'>
      <div className='absolute inset-0 flex items-center justify-center'>
        <div
          style={{
            width: 'min(100vw, 100vh)',
            height: 'min(100vw, 100vh)',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
});
