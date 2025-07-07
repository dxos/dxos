//
// Copyright 2025 DXOS.org
//

import { draggable } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import React, { type PropsWithChildren, useEffect, useRef, useState } from 'react';

import { invariant } from '@dxos/invariant';
import { type ThemedClassName } from '@dxos/react-ui';
import { Card } from '@dxos/react-ui-stack';

import { useGridContext } from './Grid';
import { getGridRect } from './geometry';
import { type Position, type HasId, type CellLayout } from './types';

type DragState = 'idle' | 'dragging';

export type CellProps<T extends HasId = any> = ThemedClassName<
  PropsWithChildren<{
    item: T;
    layout: CellLayout;
  }>
>;

export const Cell = ({ classNames, children, item, layout }: CellProps) => {
  const { grid, zoom, onSelect, onDelete, onMove } = useGridContext(Cell.displayName);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const dragHandleRef = useRef<HTMLButtonElement | null>(null);
  const [dragState, setDragState] = useState<DragState>('idle');
  useEffect(() => {
    invariant(rootRef.current);
    invariant(dragHandleRef.current);
    return draggable({
      element: rootRef.current,
      dragHandle: dragHandleRef.current,
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
      ref={rootRef}
      // TODO(burdon): Root should have no padding by default (leave that to Content?)
      classNames='absolute p-0'
      style={getGridRect(grid, layout)}
      onClick={() => onSelect?.(item.id)}
    >
      <Card.Content classNames='bs-full'>
        <Card.Toolbar>
          {/* TODO(burdon): How to set disabled? */}
          <Card.DragHandle toolbarItem ref={dragHandleRef} />
          {/* TODO(burdon): Heading has strange padding (makes the Toolbar too tall). */}
          {/* <Card.Heading classNames='grow truncate'>{title}</Card.Heading> */}
          <h1 className='grow truncate pli-1'>{title}</h1>
          {dragState !== 'dragging' && (
            <Card.ToolbarIconButton
              // TODO(burdon): Should be the same size/padding as the DragHandle (and square by default).
              classNames='px-2'
              variant='ghost'
              icon='ph--x--regular'
              iconOnly
              label='Delete'
              onClick={() => onDelete?.(item.id)}
            />
          )}
        </Card.Toolbar>
        {children}
      </Card.Content>
    </Card.Root>
  );
};

Cell.displayName = 'Grid.Cell';
