//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { useGridContext } from './Grid';
import { getGridRect } from './geometry';
import { type HasId, type TileLayout } from './types';

// TODO(burdon): Contains surface like Kanban.
// TODO(burdon): Drag handles only visible on long hover.

export type TileProps<T extends HasId = any> = ThemedClassName<{
  item: T;
  layout: TileLayout;
}>;

export const Tile = ({ classNames, item, layout: { x, y, width = 1, height = 1 } }: TileProps) => {
  const { grid } = useGridContext('Tile');

  return (
    <div
      className={mx('absolute flex flex-col bg-inputSurface border border-separator rounded-sm shadow', classNames)}
      style={getGridRect(grid, { x, y, width, height })}
    >
      <div>
        <h1 className='p-4'>{item.id}</h1>
      </div>
    </div>
  );
};
