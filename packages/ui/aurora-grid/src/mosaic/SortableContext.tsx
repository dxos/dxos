//
// Copyright 2023 DXOS.org
//

import { SortableContext, horizontalListSortingStrategy, verticalListSortingStrategy } from '@dnd-kit/sortable';
import React, { type PropsWithChildren } from 'react';

import { useContainer, useMosaic } from './hooks';
import { type MosaicDataItem } from './types';
import { Path } from './util';

type Direction = 'horizontal' | 'vertical';

export type MosaicSortableProps<TData extends MosaicDataItem = MosaicDataItem> = PropsWithChildren<{
  id?: string;
  items?: TData[];
  direction?: Direction;
}>;

/**
 * Mosaic convenience wrapper for dnd-kit SortableContext.
 */
// TODO(burdon): Remove since just obfuscates SortableContext unless more deeply integrated with useSortableItem.
//  Otherwise accept same props as SortableContext (e.g., verticalListSortingStrategy).
export const MosaicSortableContext = ({ id, items = [], direction = 'vertical', children }: MosaicSortableProps) => {
  const { operation, activeItem, overItem } = useMosaic();
  const container = useContainer();
  const contextId = id ?? container.id;
  const Sortable = direction === 'vertical' ? Column : Row;

  const ids = items.map((item) => {
    const path = Path.create(contextId, item.id);
    // TODO(wittjosiah): Copied from Tile.tsx. Consider factoring out to ensure logic is consistent.
    const isPreview =
      activeItem &&
      activeItem.item.id === item.id &&
      overItem &&
      (Path.siblings(overItem.path, path) || Path.hasChild(overItem.path, path)) &&
      operation !== 'reject';
    return isPreview ? activeItem.path : path;
  });

  return (
    <Sortable id={contextId} items={ids}>
      {children}
    </Sortable>
  );
};

const Column = ({ children, id, items }: PropsWithChildren<{ id: string; items: string[] }>) => (
  <SortableContext id={id} items={items} strategy={verticalListSortingStrategy}>
    {children}
  </SortableContext>
);

const Row = ({ children, id, items }: PropsWithChildren<{ id: string; items: string[] }>) => (
  <SortableContext id={id} items={items} strategy={horizontalListSortingStrategy}>
    {children}
  </SortableContext>
);
