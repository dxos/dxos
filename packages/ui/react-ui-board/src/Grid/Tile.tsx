//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { Card } from '@dxos/react-ui-stack';
import { mx } from '@dxos/react-ui-theme';

import { useGridContext } from './Grid';
import { getGridRect } from './geometry';
import { type HasId, type TileLayout } from './types';

// TODO(burdon): Contains surface like Kanban.
// TODO(burdon): Drag handles only visible on hover.

export type TileProps<T extends HasId = any> = ThemedClassName<{
  item: T;
  layout: TileLayout;
}>;

export const Tile = ({ classNames, item, layout }: TileProps) => {
  const { grid, onSelect, onDelete } = useGridContext('Tile');

  return (
    <div
      className={mx('absolute flex flex-col', classNames)}
      style={getGridRect(grid, layout)}
      onClick={() => onSelect?.(item.id)}
    >
      {/* TODO(burdon): Remove need for custom padding; option to expand. */}
      <Card.Root classNames='h-full p-0'>
        {/* TODO(burdon): Should header by part of Content? If so, why is Content separate from Root? */}
        <Card.Content classNames='h-full'>
          <Card.Toolbar>
            <Card.DragHandle toolbarItem />
            {/* TODO(burdon): Card.Title? */}
            <h1 className='is-full truncate'>{item.id}</h1>
            <Card.ToolbarIconButton
              icon='ph--x--regular'
              size={5}
              iconOnly
              label='Delete'
              onClick={() => onDelete?.(item.id)}
            />
          </Card.Toolbar>
        </Card.Content>
      </Card.Root>
    </div>
  );
};
