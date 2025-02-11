//
// Copyright 2025 DXOS.org
//

import React, { type PropsWithChildren, useRef, useMemo, Fragment } from 'react';
import useResizeObserver from 'use-resize-observer';

import { invariant } from '@dxos/invariant';
import { type ClassNameValue } from '@dxos/react-ui';

import { type PieceRecord, type Location, Square, getSquareLocation, Piece, isEqualLocation } from '../Board';
import { getRelativeBounds, type DOMRectBounds } from '../Board/util';

export type ChessboardProps = PropsWithChildren<{
  rows?: number;
  cols?: number;
  pieces?: PieceRecord[];
  showLabels?: boolean;
}>;

/**
 * Chessboard layout.
 */
export const Chessboard = ({ rows = 8, cols = 8, pieces, showLabels = false }: ChessboardProps) => {
  const { ref: containerRef, width, height } = useResizeObserver();
  const ref = useRef<HTMLDivElement>(null);

  const locations = useMemo<Location[]>(() => {
    return Array.from({ length: rows }, (_, i) => rows - 1 - i).flatMap((row) =>
      Array.from({ length: cols }).map((_, col) => [row, col] as Location),
    );
  }, [rows, cols]);

  // Use browser layout engine to position squares.
  const layout = useMemo(
    () =>
      locations.map((location) => (
        <div
          key={location.join(',')}
          {...{
            ['data-location' as const]: location.join(','),
          }}
        />
      )),
    [locations],
  );

  // Calculate the bounds of each square.
  const squares = useMemo<
    { location: Location; bounds: DOMRectBounds; className: ClassNameValue; piece?: PieceRecord }[]
  >(() => {
    if (!ref.current) {
      return [];
    }

    return locations.map((location) => {
      invariant(ref.current);
      const square = getSquareLocation(ref.current, location)!;
      const bounds = getRelativeBounds(ref.current, square);
      const piece = pieces?.find((p) => isEqualLocation(p.location, location));
      return { location, bounds, className: getColor(location), piece };
    });
  }, [pieces, width, height]);

  return (
    <div ref={containerRef} className='relative'>
      <div ref={ref} className='grid grid-cols-8 grid-rows-8 aspect-square select-none'>
        {layout}
      </div>
      <div>
        {squares.map(({ location, bounds, className, piece }) => (
          <Fragment key={location.join(',')}>
            <Square
              location={location}
              label={showLabels ? locationToPos(location) : undefined}
              bounds={bounds}
              classNames={[className]}
            />
            {piece && (
              <Piece
                bounds={bounds}
                location={location}
                pieceType={piece.type}
                Component={ChessPieces[piece.type as ChessPiece]}
              />
            )}
          </Fragment>
        ))}
      </div>
    </div>
  );
};
