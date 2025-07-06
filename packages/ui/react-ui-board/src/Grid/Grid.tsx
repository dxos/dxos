//
// Copyright 2025 DXOS.org
//

import React, { forwardRef } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { Tile } from './Tile';

// TODO(burdon): Drag cards.
// TODO(burdon): Infinite canvas.
// TODO(burdon): Editors with concurrent AI tiles.

type GridRootProps<T = any> = ThemedClassName<{ items: T[] }>;

const GridRoot = forwardRef<HTMLDivElement, GridRootProps>(({ classNames, items }, ref) => {
  return (
    <div className={mx('relative grid grow border-2 border-blue-500', classNames)} ref={ref}>
      <Tile />
    </div>
  );
});

export const Grid = {
  Root: GridRoot,
};

export type { GridRootProps };
