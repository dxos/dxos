//
// Copyright 2023 DXOS.org
//

import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import React, { FC } from 'react';

import { mx } from '@dxos/aurora-theme';

import {
  DefaultComponent,
  MosaicContainerProps,
  MosaicDataItem,
  MosaicDraggedItem,
  MosaicTileComponent,
  useMosaicContainer,
  useSortedItems,
} from '../../dnd';
import { Debug } from '../Debug';

type StackRootProps = MosaicContainerProps<any> & {
  items?: MosaicDataItem[];
  debug?: boolean;
};

const StackRoot = ({ id, items = [], debug = false, Component = DefaultComponent, onMoveItem }: StackRootProps) => {
  useMosaicContainer({ id, Component, onMoveItem });
  const sortedItems = useSortedItems(id, items);

  return (
    <SortableContext id={id} items={sortedItems.map(({ id }) => id)} strategy={verticalListSortingStrategy}>
      <div className='flex flex-col overflow-y-scroll'>
        {debug && <Debug data={{ id, items: sortedItems.length }} />}
        <div className='flex flex-col m-4 gap-4'>
          {sortedItems.map((item, i) => (
            <Tile key={item.id} container={id} item={item} Component={Component} index={i} />
          ))}
        </div>
      </div>
    </SortableContext>
  );
};

const Tile: FC<{
  container: string;
  item: MosaicDataItem;
  Component: MosaicTileComponent<any>;
  index: number;
  onSelect?: () => void;
}> = ({ item, container, Component, index, onSelect }) => {
  const { setNodeRef, attributes, listeners, transform, isDragging } = useSortable({
    id: item.id,
    data: { container, item, position: index } satisfies MosaicDraggedItem,
  });

  return (
    <Component
      ref={setNodeRef}
      data={item}
      isDragging={isDragging}
      draggableStyle={{
        transform: transform ? CSS.Transform.toString(Object.assign(transform, { scaleY: 1 })) : undefined,
      }}
      draggableProps={{ ...attributes, ...listeners }}
      className={mx(isDragging && 'opacity-30')}
      onSelect={onSelect}
    />
  );
};

export const Stack = {
  Root: StackRoot,
};

export type { StackRootProps };
