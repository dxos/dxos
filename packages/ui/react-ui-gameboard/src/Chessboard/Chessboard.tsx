//
// Copyright 2025 DXOS.org
//

import React, { type PropsWithChildren, useRef, useMemo, useEffect, useState, memo } from 'react';
import { useResizeDetector } from 'react-resize-detector';

import { useTrackProps } from '@dxos/react-ui';
import { isNotFalsy } from '@dxos/util';

import { type ChessPiece, ChessPieces, getSquareColor, locationToPos } from './chess';
import {
  type DOMRectBounds,
  type Location,
  type PieceRecord,
  type Player,
  Piece,
  Square,
  getRelativeBounds,
  locationToString,
} from '../Board';
import { useBoardContext } from '../Board';

export type ChessboardProps = PropsWithChildren<{
  orientation?: Player;
  showLabels?: boolean;
  debug?: boolean;
  rows?: number;
  cols?: number;
}>;

/**
 * Chessboard layout.
 */
export const Chessboard = memo(({ orientation, showLabels, debug, rows = 8, cols = 8 }: ChessboardProps) => {
  useTrackProps({ orientation, showLabels, debug }, Chessboard.displayName, false);
  const { ref: containerRef, width, height } = useResizeDetector({ refreshRate: 200 });
  const { model, promoting } = useBoardContext();

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
  const gridRef = useRef<HTMLDivElement>(null);
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

  // Get the bounds of each square and piece.
  const positions = useMemo<{ bounds: DOMRectBounds; piece: PieceRecord }[]>(() => {
    if (!gridRef.current) {
      return [];
    }

    return Object.values(model?.pieces.value ?? {})
      .map((piece) => {
        if (piece.id === promoting?.id) {
          return null;
        }

        const bounds = grid[locationToString(piece.location)];
        return { bounds, piece };
      })
      .filter(isNotFalsy);
  }, [grid, model?.pieces.value, promoting]);

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
          />
        ))}
      </div>
      <div className='grow'>
        {positions.map(({ bounds, piece }) => (
          <Piece
            key={piece.id}
            piece={piece}
            bounds={bounds}
            label={debug ? piece.id : undefined}
            orientation={orientation}
            Component={ChessPieces[piece.type as ChessPiece]}
          />
        ))}
      </div>
    </div>
  );
});

Chessboard.displayName = 'Chessboard';

const getSquareLocation = (container: HTMLElement, location: Location): HTMLElement | null => {
  return container.querySelector(`[data-location="${locationToString(location)}"]`);
};

const PromotionSelector = () => {
  return <div>PromotionSelector</div>;
};
