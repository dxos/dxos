//
// Copyright 2023 DXOS.org
//

import {
  defaultAnimateLayoutChanges,
  horizontalListSortingStrategy,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import React, { FC, forwardRef, PropsWithChildren } from 'react';

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
  getTransformCSS,
} from '../../dnd';
import { Debug } from '../Debug';

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

// TODO(burdon): Make generic.
const KanbanRoot = ({
  id,
  debug,
  columns,
  Component = DefaultComponent,
  onDrop,
  children,
}: PropsWithChildren<KanbanRootProps<any>>) => {
  return (
    <MosaicContainer
      container={{
        id,
        debug,
        Component: OverlayComponent(id, Component),
        modifier: (item, { transform }) => (item.container === id ? { ...transform, y: 0 } : transform),
        isDroppable: (item) => item.container.split('/')[0] === id,
        onDrop,
      }}
    >
      {/* TODO(burdon): Restrict to horizontal axis: requires nesting contexts. */}
      {/* <DndContext modifiers={[restrictToHorizontalAxis]}> */}
      <SortableContext id={id} items={columns.map(({ id }) => id)} strategy={horizontalListSortingStrategy}>
        {children}
      </SortableContext>
      {/* </DndContext> */}
    </MosaicContainer>
  );
};

const OverlayComponent = (id: string, Component: MosaicTileComponent<any>): MosaicTileComponent<any> =>
  forwardRef((props, ref) => {
    // if (props.isActive) {
    //   console.log('OverlayComponent', props);
    // }
    return props.container === id ? (
      // TODO(wittjosiah): Why does it need to be this id for reordering to work?
      <MosaicContainer container={{ id: props.data.id, Component }}>
        <KanbanColumnComponent {...props} ref={ref} />
      </MosaicContainer>
    ) : (
      <Component {...props} ref={ref} />
    );
  });

type KanbanColumnItem = {
  id: string;
  title: string;
  items: MosaicDataItem[];
};

type KanbanColumnProps = {
  column: KanbanColumnItem;
  index: number;
};

const KanbanColumn = ({ column, index }: KanbanColumnProps) => {
  const { id, debug } = useContainer();
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: column.id,
    data: { container: id, item: column, position: index } satisfies MosaicDraggedItem,
  });

  return (
    <KanbanColumnComponent
      ref={setNodeRef}
      isDragging={isDragging}
      draggableStyle={{
        transform: getTransformCSS(transform),
        transition,
      }}
      draggableProps={{ ...attributes, ...listeners }}
      container={id}
      position={index}
      data={column}
      debug={debug}
    />
  );
};

type KanbanColumnComponentProps = MosaicTileProps<KanbanColumnItem> & {
  Component?: MosaicTileComponent<any>;
  onDrop?: MosaicContainerProps<any, number>['onDrop'];
};

const KanbanColumnComponent = forwardRef<HTMLDivElement, KanbanColumnComponentProps>(
  ({ container, data: { id, title, items }, isDragging, draggableStyle, draggableProps, debug }, forwardRef) => {
    const column = `${container}/column/${id}`;
    const sortedItems = useSortedItems({
      container: column,
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
        className={mx(groupSurface, 'flex flex-col w-[300px] snap-center overflow-hidden', isDragging && 'opacity-0')}
        style={draggableStyle}
      >
        <Card.Root classNames='shrink-0 bg-blue-100'>
          <Card.Header>
            <Card.DragHandle {...draggableProps} />
            <Card.Title title={title} />
            <Card.Menu />
          </Card.Header>
        </Card.Root>

        <SortableContext id={id} items={sortedItems.map(({ id }) => id)} strategy={verticalListSortingStrategy}>
          <div className='flex flex-col grow overflow-y-scroll'>
            <div className='flex flex-col m-2 my-3 space-y-3'>
              {sortedItems.map((item, i) => (
                <KanbanTile key={item.id} item={item} column={column} index={i} />
              ))}
            </div>
          </div>
          {debug && <Debug data={{ container, id, items: sortedItems.length }} />}
        </SortableContext>
      </div>
    );
  },
);

const KanbanTile: FC<{
  item: MosaicDataItem;
  column: string;
  index: number;
  debug?: boolean;
  onSelect?: () => void;
}> = ({ item, column, index, debug, onSelect }) => {
  const { Component = DefaultComponent } = useContainer();
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: item.id,
    data: { container: column, item, position: index } satisfies MosaicDraggedItem,
    animateLayoutChanges: (args) => defaultAnimateLayoutChanges({ ...args, wasDragging: true }),
  });

  return (
    <Component
      ref={setNodeRef}
      data={item}
      container={column}
      position={index}
      isDragging={isDragging}
      draggableStyle={{
        transform: getTransformCSS(transform),
        transition,
      }}
      draggableProps={{ ...attributes, ...listeners }}
      className={mx(isDragging && 'opacity-0')}
      onSelect={onSelect}
      debug={debug}
    />
  );
};

export const Kanban = {
  Root: KanbanRoot,
  Column: KanbanColumn,
};

export type { KanbanColumn, KanbanRootProps };
