//
// Copyright 2023 DXOS.org
//

import { horizontalListSortingStrategy, SortableContext, useSortable } from '@dnd-kit/sortable';
import React, { forwardRef, PropsWithChildren } from 'react';

import { Card } from '@dxos/aurora';
import { groupSurface, mx } from '@dxos/aurora-theme';

import {
  MosaicContainerProps,
  MosaicContainer,
  MosaicDataItem,
  MosaicDraggedItem,
  MosaicTileProps,
  useContainer,
  useSortedItems,
  DefaultComponent,
  MosaicTileComponent,
  getTransform,
} from '../../dnd';
import { Debug } from '../Debug';
import { Stack } from '../Stack';

// Example:
// https://master--5fc05e08a4a65d0021ae0bf2.chromatic.com/?path=/story/presets-sortable-multiple-containers--basic-setup

// TODO(burdon): Is Kanban too specific? E.g., vs. ColumnBoard?

type KanbanColumn<TData extends MosaicDataItem> = MosaicDataItem & {
  title: string;
  items: TData[];
};

type KanbanRootProps<TData extends MosaicDataItem> = MosaicContainerProps<TData, number> & {
  columns: KanbanColumn<TData>[];
};

// TODO(burdon): Make generic (and forwardRef).
const KanbanRoot = forwardRef<HTMLDivElement, PropsWithChildren<KanbanRootProps<any>>>(
  ({ id, columns, Component = DefaultComponent, onDrop, children }, forwardRef) => {
    return (
      <MosaicContainer
        container={{
          id,
          // TODO(burdon): Type (because of ref?)
          // TODO(burdon): Figure out how to pass to column?
          Component: ((props) => (
            <KanbanColumnComponent {...props} Component={Component} />
          )) as MosaicTileComponent<any>,
          isDroppable: (item) => item.container === id,
          onDrop,
        }}
      >
        {/* TODO(burdon): Restrict to horizontal axis: requires nesting contexts. */}
        {/* <DndContext modifiers={[restrictToHorizontalAxis]}> */}
        <SortableContext id={id} items={columns.map(({ id }) => id)} strategy={horizontalListSortingStrategy}>
          <div ref={forwardRef} className='flex grow overflow-y-hidden overflow-x-auto'>
            <div className='flex gap-4'>{children}</div>
          </div>
        </SortableContext>
        {/* </DndContext> */}
      </MosaicContainer>
    );
  },
);

type KanbanColumnItem = {
  id: string;
  title: string;
  items: MosaicDataItem[];
};

type KanbanColumnProps = {
  column: KanbanColumnItem;
  index: number;
  debug?: boolean;
  Component?: MosaicTileComponent<any>;
  onDrop?: MosaicContainerProps<any, number>['onDrop'];
};

const KanbanColumn = ({ column, index, debug, Component, onDrop }: KanbanColumnProps) => {
  const { id } = useContainer();
  const { setNodeRef, attributes, listeners, transform, isDragging } = useSortable({
    id: column.id,
    data: { container: id, item: column, position: index } satisfies MosaicDraggedItem,
  });

  return (
    <KanbanColumnComponent
      ref={setNodeRef}
      isDragging={isDragging}
      draggableStyle={{
        transform: getTransform(transform),
      }}
      draggableProps={{ ...attributes, ...listeners }}
      container={id}
      data={column}
      debug={debug}
      Component={Component}
      onDrop={onDrop}
    />
  );
};

type KanbanColumnComponentProps = MosaicTileProps<KanbanColumnItem> & {
  Component?: MosaicTileComponent<any>;
  onDrop?: MosaicContainerProps<any, number>['onDrop'];
};

const KanbanColumnComponent = forwardRef<HTMLDivElement, KanbanColumnComponentProps>(
  (
    {
      container,
      data: { id, title, items },
      isDragging,
      draggableStyle,
      draggableProps,
      debug,
      Component = DefaultComponent,
      onDrop,
    },
    forwardRef,
  ) => {
    const sortedItems = useSortedItems({
      container: id,
      items,
      // TODO(burdon): Use this to prevent drop.
      // isDroppable: container.isDroppable,
      isDroppable: (active) => {
        // Don't allow columns to be dragged into columns.
        return active.container !== container;
      },
    });

    return (
      <div
        ref={forwardRef}
        className={mx(groupSurface, 'flex flex-col w-[300px] snap-center overflow-hidden', isDragging && 'opacity-30')}
        style={draggableStyle}
      >
        <Card.Root classNames='shrink-0 bg-blue-100'>
          <Card.Header>
            <Card.DragHandle {...draggableProps} />
            <Card.Title title={title} />
            <Card.Menu />
          </Card.Header>
        </Card.Root>

        <Stack.Root id={id} items={sortedItems.map(({ id }) => id)} Component={Component} onDrop={onDrop}>
          <div className='flex flex-col grow overflow-y-scroll'>
            <div className='flex flex-col m-2 my-3 space-y-3'>
              {sortedItems.map((item, i) => (
                <Stack.Tile key={item.id} item={item} index={i} />
              ))}
            </div>
          </div>
          {debug && <Debug data={{ container, id, items: sortedItems.length }} />}
        </Stack.Root>
      </div>
    );
  },
);

export const Kanban = {
  Root: KanbanRoot,
  Column: KanbanColumn,
};

export type { KanbanColumn, KanbanRootProps };
