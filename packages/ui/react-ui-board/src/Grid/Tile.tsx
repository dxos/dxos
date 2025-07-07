//
// Copyright 2025 DXOS.org
//

import { draggable } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import React, { useEffect, useRef, useState } from 'react';

import { invariant } from '@dxos/invariant';
import { type ThemedClassName } from '@dxos/react-ui';
import { Card } from '@dxos/react-ui-stack';

import { useGridContext } from './Grid';
import { getGridRect } from './geometry';
import { type Position, type HasId, type TileLayout } from './types';

type DragState = 'idle' | 'dragging';

export type TileProps<T extends HasId = any> = ThemedClassName<{
  item: T;
  layout: TileLayout;
}>;

export const Tile = ({ classNames, item, layout }: TileProps) => {
  const { grid, zoom, onSelect, onDelete, onMove } = useGridContext(Tile.displayName);

  const ref = useRef<HTMLDivElement | null>(null);
  const [dragState, setDragState] = useState<DragState>('idle');
  useEffect(() => {
    const element = ref.current;
    invariant(element);
    return draggable({
      element,
      canDrag: () => !zoom,
      onDragStart: () => {
        setDragState('dragging');
      },
      onDrop: ({
        location: {
          current: { dropTargets },
        },
      }) => {
        setDragState('idle');
        const position = dropTargets[0]?.data.position as Position;
        if (position) {
          onMove?.(item.id, position);
        }
      },
    });
  }, [zoom]);

  // TODO(burdon): Title accessor?
  const title = item.id;

  return (
    <Card.Root
      ref={ref}
      // TODO(burdon): Root should have no padding by default (leave that to Content?)
      classNames='absolute p-0'
      style={getGridRect(grid, layout)}
      onClick={() => onSelect?.(item.id)}
    >
      {/* TODO(burdon): Should the header (toolbar) be inside Content? If so, why is Content separate from Root? (e.g., rather than a Body). */}
      <Card.Content classNames='h-full'>
        <Card.Toolbar>
          {/* TODO(burdon): How to set disabled? */}
          <Card.DragHandle toolbarItem />
          {/* TODO(burdon): Heading has strange padding (makes the Toolbar too tall). */}
          {/* <Card.Heading classNames='grow truncate'>{title}</Card.Heading> */}
          <h1 className='grow truncate pli-1'>{title}</h1>
          {dragState !== 'dragging' && (
            <Card.ToolbarIconButton
              // TODO(burdon): Should be the same size/padding as the DragHandle (and square by default).
              classNames='px-2'
              icon='ph--x--regular'
              iconOnly
              label='Delete'
              onClick={() => onDelete?.(item.id)}
            />
          )}
        </Card.Toolbar>
        {/* TODO(burdon): Surface? */}
      </Card.Content>
    </Card.Root>
  );
};

Tile.displayName = 'Grid.Tile';
