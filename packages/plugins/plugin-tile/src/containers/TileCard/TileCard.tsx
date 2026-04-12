//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';

import { tileVertices, verticesToSvgPoints, gridToPhysical } from '#geometry';
import { type Tile } from '#types';

export type TileCardProps = AppSurface.ObjectCardProps<Tile.Pattern>;

export const TileCard = ({ subject: pattern }: TileCardProps) => {
  const { gridType, gridWidth, gridHeight, tileSize, groutWidth, palette, cells } = pattern;
  const physical = gridToPhysical(tileSize, groutWidth, gridWidth, gridHeight, gridType);

  const polygons = useMemo(() => {
    const result: Array<{ key: string; points: string; color: string }> = [];
    for (const [key, colorIndex] of Object.entries(cells)) {
      const [q, r] = key.split(',').map(Number);
      const vertices = tileVertices(q, r, gridType, tileSize);
      const color = palette[colorIndex as number] ?? '#888';
      result.push({ key, points: verticesToSvgPoints(vertices), color });
    }
    return result;
  }, [cells, palette, gridType, tileSize]);

  return (
    <svg viewBox={`-10 -10 ${physical.widthMm + 20} ${physical.heightMm + 20}`} className='w-full h-full'>
      {polygons.map(({ key, points, color }) => (
        <polygon key={key} points={points} fill={color} stroke='rgba(128,128,128,0.3)' strokeWidth={groutWidth} />
      ))}
    </svg>
  );
};
