//
// Copyright 2026 DXOS.org
//

import React, { useCallback } from 'react';

import { type Tile } from '#types';
import { type Coord, tileVertices, verticesToSvgPoints } from '#geometry';

export type TileCellProps = {
  coord: Coord;
  gridType: Tile.GridType;
  tileSize: number;
  color?: string;
  hovered?: boolean;
  groutWidth: number;
  onClick?: (coord: Coord) => void;
  onHover?: (coord: Coord) => void;
};

export const TileCell = ({ coord, gridType, tileSize, color, hovered, groutWidth, onClick, onHover }: TileCellProps) => {
  const vertices = tileVertices(coord.q, coord.r, gridType, tileSize);
  const points = verticesToSvgPoints(vertices);

  const handleClick = useCallback(() => onClick?.(coord), [onClick, coord]);
  const handleMouseEnter = useCallback(() => onHover?.(coord), [onHover, coord]);

  return (
    <polygon
      points={points}
      fill={color ?? 'transparent'}
      stroke={hovered ? '#60a5fa' : 'rgba(128,128,128,0.3)'}
      strokeWidth={groutWidth}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      className='cursor-pointer'
    />
  );
};
