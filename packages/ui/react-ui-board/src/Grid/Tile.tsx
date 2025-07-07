//
// Copyright 2025 DXOS.org
//

import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { draggable } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import React, { useEffect, useRef, useState } from 'react';

import { invariant } from '@dxos/invariant';
import { type ThemedClassName } from '@dxos/react-ui';
import { Card } from '@dxos/react-ui-stack';
import { mx } from '@dxos/react-ui-theme';

import { useGridContext } from './Grid';
import { getGridRect } from './geometry';
import { type HasId, type TileLayout } from './types';

// TODO(burdon): Contains surface like Kanban.
// TODO(burdon): Drag handles only visible on hover.

type DragState = 'idle' | 'dragging';

export type TileProps<T extends HasId = any> = ThemedClassName<{
  item: T;
  layout: TileLayout;
}>;

export const Tile = ({ classNames, item, layout }: TileProps) => {
  const { grid, onSelect, onDelete } = useGridContext('Tile');

  // TODO(burdon): Title accessor.
  const title = item.id;

  const ref = useRef<HTMLDivElement | null>(null);
  const [dragState, setDragState] = useState<DragState>('idle');
  useEffect(() => {
    const element = ref.current;
    invariant(element);
    return combine(
      draggable({
        element,
        onDragStart: () => {
          setDragState('dragging');
        },
        onDrop: () => {
          setDragState('idle');
        },
      }),
    );
  }, []);

  return (
    <div
      ref={ref}
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
            <h1 className='is-full pis-1 truncate'>{title}</h1>
            {dragState !== 'dragging' && (
              <Card.ToolbarIconButton
                icon='ph--x--regular'
                size={5}
                iconOnly
                label='Delete'
                onClick={() => onDelete?.(item.id)}
              />
            )}
          </Card.Toolbar>
        </Card.Content>
      </Card.Root>
    </div>
  );
};
