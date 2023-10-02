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
import { Debug } from '../Debug';

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
  // TODO(burdon): Remove styles.
  return (
    <SortableContext id={id} items={items} strategy={verticalListSortingStrategy}>
      <MosaicContainerProvider container={{ id, Component, onMoveItem }}>
        <div className='flex flex-col overflow-y-scroll'>
          <div className='flex flex-col m-2 gap-4'>
            {children}
            {/* TODO(burdon): Placeholder at end. */}
          </div>
          {debug && <Debug data={{ id, items: items.length }} />}
        </div>
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
      data={item}
      onSelect={onSelect}
    />
  );
};

export const Stack = {
  Root: StackRoot,
  Tile: StackTile,
};

export type { StackRootProps };
