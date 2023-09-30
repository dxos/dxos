//
// Copyright 2023 DXOS.org
//

import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Position } from 'packages/ui/aurora-grid/src/components/Grid/util';
import React, { FC } from 'react';

import { mx } from '@dxos/aurora-theme';

import { MosaicDataItem, MosaicTileComponent } from '../../dnd';

type StackDataItem<T> = MosaicDataItem<T, number>;

type StackRootProps<TData> = {
  id: string; // TODO(burdon): Combine with items.
  items: StackDataItem<any>[];
  render: MosaicTileComponent<TData>;
};

const StackRoot = ({ id, items, render }: StackRootProps<any>) => {
  // TODO(burdon): Order items.
  // const ghost = useGhost(id);

  return (
    <SortableContext id={id} items={items.map(({ id }) => id)} strategy={verticalListSortingStrategy}>
      <div className='flex flex-col overflow-y-scroll'>
        <div className='flex flex-col m-4 gap-4'>
          {items.map((item) => (
            <Tile key={item.id} parent={id} id={item.id} data={item.data} Component={render} />
          ))}
        </div>
      </div>
    </SortableContext>
  );
};

const Tile: FC<StackDataItem<any> & { Component: MosaicTileComponent<any>; onSelect?: () => void }> = ({
  parent,
  id,
  data,
  Component,
  onSelect,
}) => {
  const { setNodeRef, attributes, listeners, transform, isDragging } = useSortable({
    id,
    data: { id, data, parent } satisfies MosaicDataItem<unknown, Position>,
  });

  return (
    <Component
      ref={setNodeRef}
      id={id}
      data={data}
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

export type { StackDataItem, StackRootProps };
