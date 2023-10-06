//
// Copyright 2023 DXOS.org
//

import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
  verticalListSortingStrategy,
  defaultAnimateLayoutChanges,
} from '@dnd-kit/sortable';
import React, { FC, PropsWithChildren } from 'react';

import { mx } from '@dxos/aurora-theme';

import {
  DefaultComponent,
  getTransformCSS,
  MosaicContainer,
  MosaicContainerProps,
  MosaicDataItem,
  MosaicDraggedItem,
  Path,
  useContainer,
  useMosaic,
} from '../../dnd';

export type Direction = 'horizontal' | 'vertical';

type StackRootProps<TData extends MosaicDataItem> = MosaicContainerProps<TData, number>;

// TODO(burdon): Make generic (and forwardRef).
const StackRoot = ({
  id,
  Component = DefaultComponent,
  onDrop,
  isDroppable,
  children,
}: PropsWithChildren<StackRootProps<any>>) => {
  return <MosaicContainer container={{ id, Component, isDroppable, onDrop }}>{children}</MosaicContainer>;
};

type StackViewportProps<TData extends MosaicDataItem> = {
  items?: TData[];
  direction?: Direction;
};

const StackViewport = ({
  children,
  items = [],
  direction = 'vertical',
}: PropsWithChildren<StackViewportProps<any>>) => {
  const { id } = useContainer();
  const strategy = direction === 'vertical' ? verticalListSortingStrategy : horizontalListSortingStrategy;

  return (
    <SortableContext id={id} items={items.map((item) => Path.create(id, item.id))} strategy={strategy}>
      {children}
    </SortableContext>
  );
};

const StackTile: FC<{
  item: MosaicDataItem;
  index: number;
  debug?: boolean;
  onSelect?: () => void;
}> = ({ item, index, debug, onSelect }) => {
  const { activeItem, overItem } = useMosaic();
  const { id: container, Component = DefaultComponent } = useContainer();
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging: isDraggingLocal,
  } = useSortable({
    id: `${container}/${item.id}`,
    data: { container, item, position: index } satisfies MosaicDraggedItem,
    animateLayoutChanges: (args) => defaultAnimateLayoutChanges({ ...args, wasDragging: true }),
  });
  const isDragging = isDraggingLocal || (activeItem?.item.id === item.id && overItem?.container === container);

  return (
    <Component
      ref={setNodeRef}
      data={item}
      container={container}
      position={index}
      isDragging={isDragging}
      draggableStyle={{
        transform: getTransformCSS(transform),
        transition,
      }}
      draggableProps={{ ...attributes, ...listeners }}
      className={mx(isDragging && 'opacity-50')}
      onSelect={onSelect}
      debug={debug}
    />
  );
};

export const Stack = {
  Root: StackRoot,
  Viewport: StackViewport,
  Tile: StackTile,
};

export type { StackRootProps };
