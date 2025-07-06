//
// Copyright 2025 DXOS.org
//

import React, { forwardRef } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { Tile, type TileProps } from './Tile';
import { type HasId, type GridLayout } from './types';

// TODO(burdon): Goal > Action > Result.
// TODO(burdon): Dashboard.
// TODO(burdon): Drag cards.
// TODO(burdon): Infinite canvas.
// TOOD(burdon): Transform center of grid.
// TODO(burdon): Editors with concurrent AI tiles.
// TODO(burdon): Connect cards to program agent. E.g., goals.

type GridRootProps<T extends HasId = any> = ThemedClassName<{
  items: T[];
  layout: GridLayout;
}>;

const GridRootInner = forwardRef<HTMLDivElement, GridRootProps>(({ classNames, items, layout }, ref) => {
  return (
    <div className={mx('relative grid grow', classNames)} ref={ref}>
      {items.map((item, index) => (
        <Tile item={item} key={index} />
      ))}
    </div>
  );
});

const GridRoot = <T extends HasId = any>(props: GridRootProps<T>) => <GridRootInner {...props} />;

export const Grid = {
  Root: GridRoot,
  Tile,
};

export type { GridRootProps, TileProps };
