//
// Copyright 2023 DXOS.org
//

import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GridItem } from 'packages/ui/aurora-grid/src/components/Grid';
import React, { FC } from 'react';

import { mx } from '@dxos/aurora-theme';

import { DraggableItem } from '../dnd';

type StackItem<T> = DraggableItem<T, number>;

type StackRootProps = {
  items: StackItem<any>[];
};

const StackRoot = ({ items }: StackRootProps) => {
  // TODO(burdon): Order items.

  return (
    <SortableContext items={items.map(({ id }) => id)} strategy={verticalListSortingStrategy}>
      <div className='flex flex-col overflow-y-scroll'>
        <div className='flex flex-col m-4 gap-4'>
          {items.map((item) => (
            <Tile key={item.id} id={item.id} data={item.data} Component={item.Component} />
          ))}
        </div>
      </div>
    </SortableContext>
  );
};

const Tile: FC<GridItem<any> & { onSelect?: () => void }> = ({ id, data, Component, onSelect }) => {
  const { setNodeRef, attributes, listeners, transform, isDragging } = useSortable({ id, data });

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

export type { StackItem, StackRootProps };
