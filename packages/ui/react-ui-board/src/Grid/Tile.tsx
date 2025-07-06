//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { useGridContext } from './Grid';
import { type HasId, type GridPosition } from './types';

// TODO(burdon): Contains surface like Kanban.
// TODO(burdon): Drag handles only visible on long hover.
// TODO(burdon): Support resizing/masonry.

export type TileProps<T extends HasId = any> = ThemedClassName<{
  item: T;
  position: GridPosition;
}>;

export const Tile = ({ classNames, item, position }: TileProps) => {
  const {
    grid: { size },
  } = useGridContext('Tile');

  return (
    <div
      className={mx('absolute flex p-4 bg-inputSurface border border-separator rounded-sm shadow', classNames)}
      style={{
        left: position.x - size.width / 2,
        top: position.y - size.height / 2,
        width: size.width,
        height: size.height,
      }}
    >
      <h1>{item.id}</h1>
    </div>
  );
};
