//
// Copyright 2025 DXOS.org
//

import React, { type PropsWithChildren, useRef, useMemo, useEffect, useState } from 'react';
import useResizeObserver from 'use-resize-observer';

import { type ChessPiece, ChessPieces, getSquareColor, locationToPos, mapPieces } from './chess';
import {
  type DOMRectBounds,
  type Location,
  type PieceRecord,
  type PieceMap,
  type Player,
  Piece,
  Square,
  getRelativeBounds,
  locationToString,
  type Move,
} from '../Board';

export type ChessboardProps = PropsWithChildren<{
  orientation?: Player;
  pieces?: PieceMap;
  showLabels?: boolean;
  debug?: boolean;
  rows?: number;
  cols?: number;
  isValidMove?: (move: Move) => boolean;
}>;

/**
 * Chessboard layout.
 */
export const Chessboard = ({
  orientation,
  pieces: _pieces,
  showLabels = false,
  debug = false,
  rows = 8,
  cols = 8,
  isValidMove,
}: ChessboardProps) => {
  const { ref: containerRef, width, height } = useResizeObserver();
  const gridRef = useRef<HTMLDivElement>(null);

  const locations = useMemo<Location[]>(() => {
    return Array.from({ length: rows }, (_, i) => (orientation === 'black' ? i : rows - 1 - i)).flatMap((row) =>
      Array.from({ length: cols }).map((_, col) => [row, col] as Location),
    );
  }, [orientation, rows, cols]);

  // Use DOM grid layout to position squares.
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

  // Build map of square locations to bounds.
  const [grid, setGrid] = useState<Record<string, DOMRectBounds>>({});
  useEffect(() => {
    setGrid(
      locations.reduce(
        (acc, location) => {
          const square = getSquareLocation(gridRef.current!, location)!;
          const bounds = getRelativeBounds(gridRef.current!, square);
          return { ...acc, [locationToString(location)]: bounds };
        },
        {} as Record<string, DOMRectBounds>,
      ),
    );
  }, [locations, width, height]);

  // TODO(burdon): Detect new game and reset.
  const [pieces, setPieces] = useState<PieceMap>({});
  useEffect(() => {
    setPieces(mapPieces(pieces, _pieces ?? {}));
  }, [_pieces]);

  // Get the bounds of each square and piece.
  const positions = useMemo<{ bounds: DOMRectBounds; piece: PieceRecord }[]>(() => {
    if (!gridRef.current) {
      return [];
    }

    return Object.values(pieces).map((piece) => {
      const bounds = grid[locationToString(piece.location)];
      return { bounds, piece };
    });
  }, [grid, pieces]);

  return (
    <div ref={containerRef} className='relative'>
      <div ref={gridRef} className='grid grid-rows-8 grid-cols-8 aspect-square select-none'>
        {layout}
      </div>
      <div>
        {locations.map((location) => (
          <Square
            key={locationToString(location)}
            location={location}
            label={showLabels ? locationToPos(location) : undefined}
            bounds={grid[locationToString(location)]}
            classNames={getSquareColor(location)}
            isValidMove={isValidMove}
          />
        ))}
      </div>
      <div>
        {positions.map(({ bounds, piece }) => (
          <Piece
            key={piece.id}
            location={piece.location}
            pieceType={piece.type}
            label={debug ? piece.id : undefined}
            transition={true}
            bounds={bounds}
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
