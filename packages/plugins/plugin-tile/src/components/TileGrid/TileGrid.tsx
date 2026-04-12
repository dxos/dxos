//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { type Tile } from '#types';
import { type Coord, type ViewBox, visibleRange } from '#geometry';

import { TileCell } from '../TileCell';

export type TileGridProps = {
  gridType: Tile.GridType;
  gridWidth: number;
  gridHeight: number;
  tileSize: number;
  groutWidth: number;
  cells: Record<string, string>;
  viewBox: ViewBox;
  hoveredCell?: Coord;
  onClick?: (coord: Coord) => void;
  onHover?: (coord: Coord) => void;
};

export const TileGrid = ({
  gridType,
  gridWidth,
  gridHeight,
  tileSize,
  groutWidth,
  cells,
  viewBox,
  hoveredCell,
  onClick,
  onHover,
}: TileGridProps) => {
  const range = useMemo(() => visibleRange(viewBox, gridType, tileSize), [viewBox, gridType, tileSize]);

  const visibleCells = useMemo(() => {
    const result: Coord[] = [];
    const qMin = Math.max(0, range.qMin);
    const qMax = Math.min(gridWidth - 1, range.qMax);
    const rMin = Math.max(0, range.rMin);
    const rMax = Math.min(gridHeight - 1, range.rMax);

    for (let r = rMin; r <= rMax; r++) {
      for (let q = qMin; q <= qMax; q++) {
        result.push({ q, r });
      }
    }
    return result;
  }, [range, gridWidth, gridHeight]);

  return (
    <g>
      {visibleCells.map(({ q, r }) => (
        <TileCell
          key={`${q},${r}`}
          coord={{ q, r }}
          gridType={gridType}
          tileSize={tileSize}
          groutWidth={groutWidth}
          color={cells[`${q},${r}`]}
          hovered={hoveredCell?.q === q && hoveredCell?.r === r}
          onClick={onClick}
          onHover={onHover}
        />
      ))}
    </g>
  );
};
