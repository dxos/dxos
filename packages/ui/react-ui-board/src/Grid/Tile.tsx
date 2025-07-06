//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { useGridContext } from './Grid';
import { type HasId, type TileLayout } from './types';

// TODO(burdon): Contains surface like Kanban.
// TODO(burdon): Drag handles only visible on long hover.
// TODO(burdon): Support resizing/masonry; center is center of unit size.

export type TileProps<T extends HasId = any> = ThemedClassName<{
  item: T;
  layout: TileLayout;
}>;

export const Tile = ({ classNames, item, layout: { x, y, width = 1, height = 1 } }: TileProps) => {
  const { grid } = useGridContext('Tile');

  return (
    <div
      className={mx('absolute flex flex-col bg-inputSurface border border-separator rounded-sm shadow', classNames)}
      style={{
        left: x * (grid.size.width + grid.gap) - grid.size.width / 2,
        top: y * (grid.size.height + grid.gap) - grid.size.height / 2,
        width: width * grid.size.width + Math.max(0, width - 1) * grid.gap,
        height: height * grid.size.height + Math.max(0, height - 1) * grid.gap,
      }}
    >
      <div>
        <h1 className='p-4'>{item.id}</h1>
      </div>
    </div>
  );
};
