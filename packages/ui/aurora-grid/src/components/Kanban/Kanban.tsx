//
// Copyright 2023 DXOS.org
//

import { horizontalListSortingStrategy, SortableContext, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import React, { FC, forwardRef } from 'react';

import { Card } from '@dxos/aurora';

import { MosaicContainerProps, MosaicDataItem, MosaicDraggedItem, MosaicTileProps, useSortedItems } from '../../dnd';
import { SimpleCard } from '../../testing';
import { Debug } from '../Debug';
import { Stack } from '../Stack';

type KanbanColumn = {
  id: string;
  title: string;
  items: MosaicDataItem[];
};

type KanbanRootProps = {
  id: string;
  columns: KanbanColumn[];
  onMoveItem: MosaicContainerProps<any, number>['onMoveItem'];
};

const KanbanRoot = ({ id, columns, onMoveItem }: KanbanRootProps) => {
  return (
    <SortableContext id={id} items={columns.map(({ id }) => id)} strategy={horizontalListSortingStrategy}>
      <div className='flex grow overflow-y-hidden overflow-x-auto'>
        <div className='flex'>
          {columns.map(({ id, title, items }, index) => (
            <ColumnTile key={id} container={id} item={{ id, title, items, onMoveItem }} index={index} />
          ))}
        </div>
      </div>
    </SortableContext>
  );
};

// TODO(burdon): Prevent dragging column from interfering with column items.

const ColumnTile: FC<{ container: string; item: ColumnProps; index: number }> = ({ container, item, index }) => {
  const { setNodeRef, attributes, listeners, transform, isDragging } = useSortable({
    id: item.id,
    data: { container, item, position: index } satisfies MosaicDraggedItem,
  });

  return (
    <Column
      ref={setNodeRef}
      isDragging={isDragging}
      draggableStyle={{
        transform: transform ? CSS.Transform.toString(Object.assign(transform, { scaleY: 1 })) : undefined,
      }}
      draggableProps={{ ...attributes, ...listeners }}
      data={item}
    />
  );
};

type ColumnProps = {
  id: string;
  title: string;
  items: MosaicDataItem[];
  onMoveItem: MosaicContainerProps<any, number>['onMoveItem'];
};

export const Column = forwardRef<HTMLDivElement, MosaicTileProps<ColumnProps>>(
  ({ draggableStyle, draggableProps, data: { id, title, items, onMoveItem } }, forwardRef) => {
    const sortedItems = useSortedItems(id, items);

    return (
      <div className='flex flex-col w-[300px] snap-center overflow-hidden'>
        <Card.Root ref={forwardRef} classNames='shrink-0 m-4 bg-blue-100' style={draggableStyle}>
          <Card.Header>
            <Card.DragHandle {...draggableProps} />
            <Card.Title title={title} />
            <Card.Menu />
          </Card.Header>
        </Card.Root>

        {/* TODO(burdon): Variant with Simple/Complex cards. */}
        <Stack.Root id={id} items={sortedItems.map(({ id }) => id)} Component={SimpleCard} onMoveItem={onMoveItem}>
          <div className='flex flex-col overflow-y-scroll'>
            <div className='flex flex-col m-2 gap-4'>
              {sortedItems.map((item, i) => (
                <Stack.Tile key={item.id} item={item} index={i} />
              ))}
            </div>
            <Debug data={{ id, items: sortedItems.length }} />
          </div>
        </Stack.Root>
      </div>
    );
  },
);

export const Kanban = {
  Root: KanbanRoot,
};

export type { KanbanRootProps, KanbanColumn };
