//
// Copyright 2023 DXOS.org
//

import { horizontalListSortingStrategy, SortableContext, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import React, { FC, forwardRef } from 'react';

import { Card } from '@dxos/aurora';
import { mx } from '@dxos/aurora-theme';

import {
  MosaicContainerProps,
  MosaicContainerProvider,
  MosaicDataItem,
  MosaicDraggedItem,
  MosaicTileProps,
  useSortedItems,
} from '../../dnd';
import { SimpleCard } from '../../testing';
import { Debug } from '../Debug';
import { Stack } from '../Stack';

type KanbanColumn = MosaicDataItem & {
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
    <MosaicContainerProvider container={{ id, Component: Column, onMoveItem }}>
      <KanbanBoard id={id} columns={columns} onMoveItem={onMoveItem} />
    </MosaicContainerProvider>
  );
};

const KanbanBoard = ({ id, columns, onMoveItem }: KanbanRootProps) => {
  return (
    // TODO(burdon): Constrain motion to horizontal.
    <SortableContext id={id} items={columns.map(({ id }) => id)} strategy={horizontalListSortingStrategy}>
      <div className='flex grow overflow-y-hidden overflow-x-auto'>
        <div className='flex gap-4'>
          {columns.map((column, index) => (
            <ColumnTile key={column.id} container={id} item={{ ...column, onMoveItem }} index={index} />
          ))}
        </div>
      </div>
    </SortableContext>
  );
};

// TODO(burdon): Reconcile Kanban vs Columns?
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
      container={container}
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

// TODO(burdon): When dragging an item, the Overlay dispatches to container's Component which is a Column!
export const Column = forwardRef<HTMLDivElement, MosaicTileProps<ColumnProps>>(
  ({ isDragging, draggableStyle, draggableProps, data: { id, title, items, onMoveItem }, container }, forwardRef) => {
    const sortedItems = useSortedItems({
      container: id,
      items,
      // TODO(burdon): Externalize to storybook.
      // TODO(burdon): Use this to prevent drop.
      allows: (active) => {
        // Don't allow columns to be dragged into columns.
        return active.container !== container;
      },
    });

    return (
      <div
        ref={forwardRef}
        className={mx('flex flex-col w-[300px] snap-center overflow-hidden', isDragging && 'opacity-30')}
        style={draggableStyle}
      >
        <Card.Root classNames='shrink-0 bg-blue-100'>
          <Card.Header>
            <Card.DragHandle {...draggableProps} />
            <Card.Title title={title} />
            <Card.Menu />
          </Card.Header>
        </Card.Root>

        <Stack.Root id={id} items={sortedItems.map(({ id }) => id)} Component={SimpleCard} onMoveItem={onMoveItem}>
          <div className='flex flex-col overflow-y-scroll ring m-1'>
            <div className='flex flex-col m-2 gap-4'>
              {sortedItems.map((item, i) => (
                <Stack.Tile key={item.id} item={item} index={i} />
              ))}
            </div>
            <Debug data={{ container, id, items: sortedItems.length }} />
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
