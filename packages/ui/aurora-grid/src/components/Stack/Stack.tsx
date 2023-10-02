//
// Copyright 2023 DXOS.org
//

import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import React, { FC, PropsWithChildren } from 'react';

import { mx } from '@dxos/aurora-theme';

import {
  DefaultComponent,
  MosaicContainerProps,
  MosaicContainerProvider,
  MosaicDataItem,
  MosaicDraggedItem,
  useContainer,
} from '../../dnd';

type StackRootProps = MosaicContainerProps<any, number> & {
  items?: string[];
  debug?: boolean;
};

const StackRoot = ({
  id,
  items = [],
  debug = false,
  Component = DefaultComponent,
  onMoveItem,
  children,
}: PropsWithChildren<StackRootProps>) => {
  return (
    <SortableContext id={id} items={items} strategy={verticalListSortingStrategy}>
      <MosaicContainerProvider container={{ id, Component, onMoveItem }}>
        {children}
        {/* TODO(burdon): Component for placeholder at end. */}
      </MosaicContainerProvider>
    </SortableContext>
  );
};

const StackTile: FC<{
  item: MosaicDataItem;
  index: number;
  onSelect?: () => void;
}> = ({ item, index, onSelect }) => {
  const { id: container, Component } = useContainer();
  const { setNodeRef, attributes, listeners, transform, isDragging } = useSortable({
    id: item.id,
    data: { container, item, position: index } satisfies MosaicDraggedItem,
  });

  return (
    <Component
      ref={setNodeRef}
      isDragging={isDragging}
      draggableStyle={{
        transform: transform ? CSS.Transform.toString(Object.assign(transform, { scaleY: 1 })) : undefined,
      }}
      draggableProps={{ ...attributes, ...listeners }}
      className={mx(isDragging && 'opacity-30')}
      container={container}
      data={item}
      onSelect={onSelect}
    />
  );
};

export const Stack = {
  Root: StackRoot,
  Tile: StackTile, // TODO(burdon): Don't expose (if truly generic then move and rename).
};

export type { StackRootProps };
