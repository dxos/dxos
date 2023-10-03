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
  useContainer,
} from '../../dnd';

export type Direction = 'horizontal' | 'vertical';

type StackRootProps<TData extends MosaicDataItem> = MosaicContainerProps<TData, number> & {
  items?: TData[];
  direction?: Direction;
};

// TODO(burdon): Make generic (and forwardRef).
const StackRoot = ({
  id,
  items = [],
  Component = DefaultComponent,
  onDrop,
  children,
  direction = 'vertical',
}: PropsWithChildren<StackRootProps<any>>) => {
  const strategy = direction === 'vertical' ? verticalListSortingStrategy : horizontalListSortingStrategy;
  return (
    <MosaicContainer container={{ id, Component, isDroppable: () => true, onDrop }}>
      <SortableContext id={id} items={items} strategy={strategy}>
        {children}
      </SortableContext>
    </MosaicContainer>
  );
};

const StackTile: FC<{
  item: MosaicDataItem;
  index: number;
  debug?: boolean;
  onSelect?: () => void;
}> = ({ item, index, debug, onSelect }) => {
  const { id: container, Component = DefaultComponent } = useContainer();
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: item.id,
    data: { container, item, position: index } satisfies MosaicDraggedItem,
    animateLayoutChanges: (args) => defaultAnimateLayoutChanges({ ...args, wasDragging: true }),
  });

  return (
    <Component
      ref={setNodeRef}
      data={item}
      container={container}
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

export const Stack = {
  Root: StackRoot,
  Tile: StackTile,
};

export type { StackRootProps };
