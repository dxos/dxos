//
// Copyright 2025 DXOS.org
//

import { draggable } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import React, { type PropsWithChildren, useEffect, useRef, useState } from 'react';

import { invariant } from '@dxos/invariant';
import { useTranslation, type ThemedClassName } from '@dxos/react-ui';
import { Card } from '@dxos/react-ui-stack';
import { mx } from '@dxos/react-ui-theme';

import { useBoardContext } from './Board';
import { getBoardRect } from './geometry';
import { type Position, type HasId, type CellLayout } from './types';
import { translationKey } from '../../translations';

type DragState = 'idle' | 'dragging';

export type CellProps<T extends HasId = any> = ThemedClassName<
  PropsWithChildren<{
    item: T;
    layout: CellLayout;
    draggable?: boolean;
    getTitle?: (item: T) => string;
  }>
>;

export const Cell = ({ classNames, children, item, layout, draggable: isDraggable, getTitle }: CellProps) => {
  const { t } = useTranslation(translationKey);
  const { grid: board, zoom, onSelect, onDelete, onMove } = useBoardContext(Cell.displayName);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const dragHandleRef = useRef<HTMLButtonElement | null>(null);
  const [dragState, setDragState] = useState<DragState>('idle');
  useEffect(() => {
    invariant(rootRef.current);
    invariant(dragHandleRef.current);
    return draggable({
      element: rootRef.current,
      dragHandle: dragHandleRef.current,
      canDrag: () => isDraggable !== false && !zoom,
      onDragStart: () => {
        // TODO(burdon): Change border of preview to outline while dragging.
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
  }, [isDraggable, zoom]);

  return (
    <Card.StaticRoot
      ref={rootRef}
      // TODO(burdon): Common fragment for placeholder opacity?
      classNames={mx('absolute p-0', dragState === 'dragging' && 'opacity-50', classNames)}
      style={getBoardRect(board, layout)}
      onClick={() => onSelect?.(item.id)}
    >
      <Card.Toolbar>
        {/* TODO(burdon): How to set disabled? */}
        <Card.DragHandle toolbarItem ref={dragHandleRef} />
        {/* TODO(burdon): Heading has strange padding (makes the Toolbar too tall). */}
        {/* <Card.Heading classNames='grow truncate'>{title}</Card.Heading> */}
        <h1 className='grow truncate pli-1'>{getTitle?.(item) ?? item.id}</h1>
        {dragState !== 'dragging' && (
          <Card.ToolbarIconButton
            // TODO(burdon): Should be the same size/padding as the DragHandle (and square by default).
            classNames='px-2'
            variant='ghost'
            icon='ph--x--regular'
            iconOnly
            label={t('button delete')}
            onClick={() => onDelete?.(item.id)}
          />
        )}
      </Card.Toolbar>
      {children}
    </Card.StaticRoot>
  );
};

Cell.displayName = 'Board.Cell';
