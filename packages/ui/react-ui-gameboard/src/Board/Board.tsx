//
// Copyright 2025 DXOS.org
//

import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import React, { forwardRef, type PropsWithChildren, useEffect, useRef, useState } from 'react';
import useResizeObserver from 'use-resize-observer';

import { invariant } from '@dxos/invariant';

import { Chessboard } from './Chessboard';
import { Piece } from './Piece';
import { getSquareLocation } from './Square';
import { type PieceRecord, isCoord, isEqualCoord, canMove, isPiece } from './types';
import { getRelativeBounds, type DOMRectBounds } from './util';
import { ChessPieces, type ChessPiece } from '../chess';

export type BoardProps = {
  pieces?: PieceRecord[];
  orientation?: 'white' | 'black'; // TODO(burdon): Flip.
};

export const Board = ({ pieces: _pieces }: BoardProps) => {
  const [pieces, setPieces] = useState<PieceRecord[]>(_pieces ?? []);
  const { ref: containerRef, width, height } = useResizeObserver();
  const ref = useRef<HTMLDivElement>(null);

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
        if (!isCoord(destinationLocation) || !isCoord(sourceLocation) || !isPiece(pieceType)) {
          return;
        }

        const piece = pieces.find((p) => isEqualCoord(p.location, sourceLocation));
        const restOfPieces = pieces.filter((p) => p !== piece);
        if (canMove(sourceLocation, destinationLocation, pieceType, pieces) && piece !== undefined) {
          setPieces([{ type: piece.type, location: destinationLocation }, ...restOfPieces]);
        }
      },
    });
  }, [pieces]);

  const [places, setPlaces] = useState<{ bounds: DOMRectBounds; piece: PieceRecord }[]>([]);
  useEffect(() => {
    if (!ref.current) {
      return;
    }

    setPlaces(
      pieces.map((piece) => {
        invariant(ref.current);
        const square = getSquareLocation(ref.current, piece.location)!;
        const bounds = getRelativeBounds(ref.current, square);
        return {
          bounds,
          piece,
        };
      }),
    );
  }, [width, height, pieces]);

  return (
    <Container ref={containerRef}>
      <Chessboard ref={ref} rows={8} cols={8}>
        {places.map(({ bounds, piece }) => (
          <Piece
            key={piece.location.join(',')}
            bounds={bounds}
            location={piece.location}
            pieceType={piece.type}
            Component={ChessPieces[piece.type as ChessPiece]}
          />
        ))}
      </Chessboard>
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
