//
// Copyright 2026 DXOS.org
//

import { type Meta } from '@storybook/react-vite';
import React, { useState } from 'react';

import { type Tile } from '#types';
import { type Coord } from '#geometry';

import { TileCanvas } from './TileCanvas';

const makePattern = (gridType: Tile.GridType): Tile.Pattern =>
  ({
    gridType,
    gridWidth: 10,
    gridHeight: 10,
    tileSize: 50,
    groutWidth: 2,
    repeatMode: 'single',
    cells: {},
  }) as Tile.Pattern;

const ACTIVE_COLOR = '#6366f1';

const TileCanvasStory = ({ gridType }: { gridType: Tile.GridType }) => {
  const [cells, setCells] = useState<Record<string, string>>({});
  const pattern: Tile.Pattern = { ...makePattern(gridType), cells };

  const handleCellPaint = (coord: Coord, color: string) => {
    setCells((prev) => ({ ...prev, [`${coord.q},${coord.r}`]: color }));
  };

  const handleCellClear = (coord: Coord) => {
    setCells((prev) => {
      const next = { ...prev };
      delete next[`${coord.q},${coord.r}`];
      return next;
    });
  };

  return (
    <div className='flex' style={{ height: '600px', width: '100%' }}>
      <TileCanvas
        pattern={pattern}
        activeColor={ACTIVE_COLOR}
        onCellPaint={handleCellPaint}
        onCellClear={handleCellClear}
      />
    </div>
  );
};

const meta: Meta = {
  title: 'plugins/plugin-tile/TileCanvas',
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

export const Square = () => <TileCanvasStory gridType='square' />;
export const Hex = () => <TileCanvasStory gridType='hex' />;
export const Triangle = () => <TileCanvasStory gridType='triangle' />;
