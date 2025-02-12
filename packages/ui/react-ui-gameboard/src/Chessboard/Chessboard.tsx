//
// Copyright 2025 DXOS.org
//

import React, { type PropsWithChildren, useRef, useMemo, useEffect, useState } from 'react';
import useResizeObserver from 'use-resize-observer';

import { invariant } from '@dxos/invariant';
import { type ClassNameValue } from '@dxos/react-ui';

import { type ChessPiece, ChessPieces, getSquareColor, locationToPos, mapPieces } from './chess';
import {
  type DOMRectBounds,
  type Location,
  Piece,
  type PieceRecord,
  type PieceRecordMap,
  Square,
  getRelativeBounds,
  locationToString,
} from '../Board';

export type ChessboardProps = PropsWithChildren<{
  rows?: number;
  cols?: number;
  pieces?: PieceRecordMap;
  showLabels?: boolean;
  debug?: boolean;
}>;

/**
 * Chessboard layout.
 */
export const Chessboard = ({
  rows = 8,
  cols = 8,
  pieces: _pieces,
  showLabels = false,
  debug = false,
}: ChessboardProps) => {
  const { ref: containerRef, width, height } = useResizeObserver();
  const gridRef = useRef<HTMLDivElement>(null);

  const locations = useMemo<Location[]>(() => {
    return Array.from({ length: rows }, (_, i) => rows - 1 - i).flatMap((row) =>
      Array.from({ length: cols }).map((_, col) => [row, col] as Location),
    );
  }, [rows, cols]);

  // Use browser layout engine to position squares.
  const layout = useMemo(() => {
    return locations.map((location) => {
      return (
        <div
          key={locationToString(location)}
          {...{
            ['data-location' as const]: locationToString(location),
          }}
        />
      );
    });
  }, [locations]);

  // Update squares when resized.
  const squares = useMemo<{ location: Location; bounds: DOMRectBounds; classNames: ClassNameValue }[]>(() => {
    if (!gridRef.current) {
      return [];
    }

    return locations.map((location) => {
      invariant(gridRef.current);
      const square = getSquareLocation(gridRef.current, location)!;
      const bounds = getRelativeBounds(gridRef.current, square);
      return { location, bounds, classNames: getSquareColor(location) };
    });
  }, [locations, width, height]);

  // TODO(burdon): Detect new game and reset.
  const [pieces, setPieces] = useState<PieceRecordMap>({});
  useEffect(() => {
    setPieces(mapPieces(pieces, _pieces ?? {}));
  }, [_pieces]);

  // Get the bounds of each square and piece.
  const positions = useMemo<{ bounds: DOMRectBounds; piece: PieceRecord }[]>(() => {
    if (!gridRef.current) {
      return [];
    }

    return Object.values(pieces).map((piece) => {
      invariant(gridRef.current);
      const square = getSquareLocation(gridRef.current, piece.location);
      invariant(square);
      const bounds = getRelativeBounds(gridRef.current, square);
      return { bounds, piece };
    });
  }, [squares, pieces]);

  return (
    <div ref={containerRef} className='relative'>
      <div ref={gridRef} className='grid grid-rows-8 grid-cols-8 aspect-square select-none'>
        {layout}
      </div>
      <div>
        {squares.map(({ location, bounds, classNames }) => (
          <Square
            key={locationToString(location)}
            location={location}
            label={showLabels ? locationToPos(location) : undefined}
            bounds={bounds}
            classNames={classNames}
          />
        ))}
      </div>
      <div>
        {positions.map(({ bounds, piece }) => (
          <Piece
            key={piece.id}
            bounds={bounds}
            location={piece.location}
            pieceType={piece.type}
            label={debug ? piece.id : undefined}
            transition={false}
            Component={ChessPieces[piece.type as ChessPiece]}
          />
        ))}
      </div>
    </div>
  );
};

const getSquareLocation = (container: HTMLElement, location: Location): HTMLElement | null => {
  return container.querySelector(`[data-location="${locationToString(location)}"]`);
};
