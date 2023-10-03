//
// Copyright 2023 DXOS.org
//

import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import React, { FC, PropsWithChildren } from 'react';

import { mx } from '@dxos/aurora-theme';

import {
  DefaultComponent,
  MosaicContainer,
  MosaicContainerProps,
  MosaicDataItem,
  MosaicDraggedItem,
  useContainer,
} from '../../dnd';

type StackRootProps<TData extends MosaicDataItem> = MosaicContainerProps<TData, number> & {
  items?: TData[];
};

// TODO(burdon): Make generic (and forwardRef).
const StackRoot = ({
  id,
  items = [],
  Component = DefaultComponent,
  onMoveItem,
  children,
}: PropsWithChildren<StackRootProps<any>>) => {
  return (
    <MosaicContainer container={{ id, Component, isDroppable: () => true, onMoveItem }}>
      <SortableContext id={id} items={items} strategy={verticalListSortingStrategy}>
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
  const { setNodeRef, attributes, listeners, transform, isDragging } = useSortable({
    id: item.id,
    data: { container, item, position: index } satisfies MosaicDraggedItem,
  });

  return (
    <Component
      ref={setNodeRef}
      data={item}
      container={container}
      isDragging={isDragging}
      draggableStyle={{
        transform: transform ? CSS.Transform.toString(Object.assign(transform, { scaleY: 1 })) : undefined,
      }}
      draggableProps={{ ...attributes, ...listeners }}
      className={mx(isDragging && 'opacity-30')}
      onSelect={onSelect}
      debug={debug}
    />
  );
};

export const Stack = {
  Root: StackRoot,
  Tile: StackTile, // TODO(burdon): Don't expose (if truly generic then move and rename).
};

export type { StackRootProps };
