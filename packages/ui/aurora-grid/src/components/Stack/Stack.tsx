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

type StackRootProps = MosaicContainerProps<any, number> & {
  items?: MosaicDataItem[];
  debug?: boolean;
};

const StackRoot = ({ id, items = [], debug = false, Component = DefaultComponent, onMoveItem }: StackRootProps) => {
  useMosaicContainer({ id, Component, onMoveItem });
  const sortedItems = useSortedItems(id, items);

  // TODO(burdon): Remove styles.
  return (
    <SortableContext id={id} items={sortedItems.map(({ id }) => id)} strategy={verticalListSortingStrategy}>
      <div className='flex flex-col overflow-y-scroll'>
        <div className='flex flex-col m-2 gap-4'>
          {sortedItems.map((item, i) => (
            <StackTile key={item.id} container={id} item={item} Component={Component} index={i} />
          ))}
          {/* TODO(burdon): Placeholder at end. */}
        </div>
        {debug && <Debug data={{ id, items: sortedItems.length }} />}
      </div>
    </SortableContext>
  );
};

const StackTile: FC<{
  container: string;
  item: MosaicDataItem;
  Component: MosaicTileComponent<any>;
  index: number;
  onSelect?: () => void;
}> = ({ container, item, Component, index, onSelect }) => {
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
};

export type { StackRootProps };
