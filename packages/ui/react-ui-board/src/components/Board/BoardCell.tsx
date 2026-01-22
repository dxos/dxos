//
// Copyright 2025 DXOS.org
//

import { draggable } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import React, { type PropsWithChildren, useEffect, useRef, useState } from 'react';

import { type Type } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { Card } from '@dxos/react-ui-mosaic';
import { mx } from '@dxos/ui-theme';

import { translationKey } from '../../translations';

import { useBoardContext } from './Board';
import { getBoardRect } from './geometry';
import { type CellLayout, type Position } from './types';

type DragState = 'idle' | 'dragging';

export type BoardCellProps<T extends Type.Obj.Any = any> = ThemedClassName<
  PropsWithChildren<{
    item: T;
    layout: CellLayout;
    draggable?: boolean;
  }>
>;

export const BoardCell = ({ classNames, children, item, layout, draggable: isDraggable }: BoardCellProps) => {
  const { t } = useTranslation(translationKey);
  const { grid: board, zoom, onSelect, onDelete, onMove } = useBoardContext(BoardCell.displayName);

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
    <Card.Root
      ref={rootRef}
      // TODO(burdon): Common fragment for placeholder opacity?
      classNames={mx(
        'absolute p-0 grid grid-rows-[min-content_1fr]',
        dragState === 'dragging' && 'opacity-50',
        classNames,
      )}
      style={getBoardRect(board, layout)}
      onClick={() => onSelect?.(item.id)}
    >
      <Card.Toolbar>
        <Card.DragHandle toolbarItem ref={dragHandleRef} />
        <Card.ToolbarSeparator variant='gap' />
        {dragState !== 'dragging' && (
          <Card.ToolbarIconButton
            variant='ghost'
            icon='ph--x--regular'
            iconOnly
            label={t('button delete')}
            onClick={() => onDelete?.(item.id)}
          />
        )}
      </Card.Toolbar>
      <div role='none' {...{ inert: true }} className='pointer-events-none min-bs-0 min-is-0'>
        {children}
      </div>
    </Card.Root>
  );
};

BoardCell.displayName = 'Board.Cell';
