//
// Copyright 2023 DXOS.org
//

import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import React, { FC } from 'react';

import { mx } from '@dxos/aurora-theme';

import { MosaicDataItem, MosaicDraggedItem, MosaicTileComponent, useGhost } from '../../dnd';

type StackDataItem<T> = MosaicDataItem<T, number>;

type StackRootProps<TData> = {
  id: string; // TODO(burdon): Combine with items.
  items: StackDataItem<TData>[];
  Component: MosaicTileComponent<any>;
};

const StackRoot = ({ id, items, Component }: StackRootProps<unknown>) => {
  const ghost = useGhost(id);
  const visibleItems = ghost ? [ghost, ...items] : items;

  return (
    <SortableContext id={id} items={visibleItems.map(({ id }) => id)} strategy={verticalListSortingStrategy}>
      <div className='flex flex-col overflow-y-scroll'>
        <pre className='font-mono text-xs overflow-hidden'>{JSON.stringify({ id, items: visibleItems.length })}</pre>
        <div className='flex flex-col m-4 gap-4'>
          {visibleItems.map((item) => (
            <Tile key={item.id} parent={id} id={item.id} data={item.data} Component={Component} />
          ))}
        </div>
      </div>
    </SortableContext>
  );
};

const Tile: FC<
  StackDataItem<unknown> & { parent: string; Component: MosaicTileComponent<unknown>; onSelect?: () => void }
> = ({ parent, id, data, Component, onSelect }) => {
  const { setNodeRef, attributes, listeners, transform, isDragging } = useSortable({
    id,
    data: { item: { id, data }, parent } satisfies MosaicDraggedItem<unknown>,
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
