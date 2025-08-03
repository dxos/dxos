//
// Copyright 2025 DXOS.org
//

import React, { Fragment, type PropsWithChildren, memo, useEffect, useMemo, useRef, useState } from 'react';
import { useResizeDetector } from 'react-resize-detector';

import { type ThemedClassName, useTrackProps } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';
import { isNotFalsy } from '@dxos/util';

import {
  type DOMRectBounds,
  Gameboard,
  type Location,
  type PieceRecord,
  type Player,
  getRelativeBounds,
  locationToString,
  useGameboardContext,
} from '../Gameboard';

import { type ChessModel, type ChessPiece, ChessPieces, boardStyles, getSquareColor, locationToPos } from './chess';

export type ChessboardProps = ThemedClassName<
  PropsWithChildren<{
    orientation?: Player;
    showLabels?: boolean;
    debug?: boolean;
    rows?: number;
    cols?: number;
  }>
>;

/**
 * Chessboard layout.
 */
export const Chessboard = memo(
  ({ orientation, showLabels, debug, rows = 8, cols = 8, classNames }: ChessboardProps) => {
    useTrackProps({ orientation, showLabels, debug }, Chessboard.displayName, false);
    const { ref: containerRef, width, height } = useResizeDetector({ refreshRate: 200 });
    const { model, promoting, onPromotion } = useGameboardContext<ChessModel>(Chessboard.displayName!);

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
    const positions = useMemo<{ piece: PieceRecord; bounds: DOMRectBounds }[]>(() => {
      if (!gridRef.current) {
        return [];
      }

      return Object.values(model?.pieces.value ?? {})
        .map((piece) => {
          if (piece.id === promoting?.id) {
            return null;
          }

          const bounds = grid[locationToString(piece.location)];
          return { piece, bounds };
        })
        .filter(isNotFalsy);
    }, [grid, model?.pieces.value, promoting]);

    return (
      <div ref={containerRef} className={mx('relative', classNames)}>
        <div ref={gridRef} className='grid grid-rows-8 grid-cols-8 aspect-square select-none'>
          {layout}
        </div>
        <div>
          {locations.map((location) => (
            <Gameboard.Square
              key={locationToString(location)}
              location={location}
              label={showLabels ? locationToPos(location) : undefined}
              bounds={grid[locationToString(location)]}
              classNames={getSquareColor(location)}
            />
          ))}
        </div>
        <div className={mx(promoting && 'opacity-50')}>
          {positions.map(({ bounds, piece }) => (
            <Gameboard.Piece
              key={piece.id}
              piece={piece}
              bounds={bounds}
              label={debug ? piece.id : undefined}
              orientation={orientation}
              Component={ChessPieces[piece.type as ChessPiece]}
            />
          ))}
        </div>
        {promoting && (
          <PromotionSelector
            grid={grid}
            piece={promoting}
            onSelect={(piece) => {
              onPromotion({
                from: Object.values(model!.pieces.value).find((p) => p.id === promoting.id)!.location,
                to: piece.location,
                piece: promoting.type,
                promotion: piece.type,
              });
            }}
          />
        )}
      </div>
    );
  },
);

Chessboard.displayName = 'Chessboard';

const getSquareLocation = (container: HTMLElement, location: Location): HTMLElement | null => {
  return container.querySelector(`[data-location="${locationToString(location)}"]`);
};

const PromotionSelector = ({
  grid,
  piece,
  onSelect,
}: {
  grid: Record<string, DOMRectBounds>;
  piece: PieceRecord;
  onSelect: (piece: PieceRecord) => void;
}) => {
  const positions = ['Q', 'N', 'R', 'B'].map((pieceType, i) => {
    const location = [piece.location[0] + (piece.location[0] === 0 ? i : -i), piece.location[1]] as Location;
    return {
      piece: {
        id: `promotion-${pieceType}`,
        type: (piece.side === 'black' ? 'B' : 'W') + pieceType,
        side: piece.side,
        location,
      },
      bounds: grid[locationToString(location)],
    };
  });

  const handleSelect = (selected: PieceRecord) => {
    onSelect({ ...piece, type: selected.type });
  };

  return (
    <>
      {positions.map(({ piece, bounds }) => (
        <Gameboard.Piece
          key={piece.id}
          piece={piece}
          bounds={bounds}
          Component={ChessPieces[piece.type as ChessPiece]}
          classNames={mx('border-2 border-neutral-700 rounded-full', boardStyles.promotion)}
          onClick={() => handleSelect(piece)}
        />
      ))}
    </>
  );
};
