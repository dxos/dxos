//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React, { FC, HTMLAttributes, useCallback, useState } from 'react';

import { TestComponentProps } from './test';
import { MosaicMoveEvent, useSortedItems } from '../../dnd';
import { createItem } from '../../testing';
import { Tree, TreeData } from '../Tree';

export const DemoTree: FC<TestComponentProps<any> & HTMLAttributes<HTMLDivElement>> = ({
  id,
  types,
  debug,
  className,
}) => {
  const [items, setItems] = useState<TreeData[]>(() =>
    Array.from({ length: 4 }).map(() => ({
      ...createItem(types),
      items: Array.from({ length: 3 }).map(() => ({
        ...createItem(types),
        items: [],
      })),
    })),
  );

  const sortedItems = useSortedItems({ container: id, items, isDroppable: () => false });

  // TODO(burdon): Implement.
  const handleDrop = useCallback(({ active, over }: MosaicMoveEvent<number>) => {}, [items]);

  return (
    <Tree.Root id={id} items={sortedItems} onDrop={handleDrop} className={className} debug={debug}>
      {/* TODO(burdon): Remove div. */}
      <div className='flex flex-col overflow-hidden'>
        {sortedItems.map((item, index) => (
          <Tree.Tile key={item.id} item={item} index={index} />
        ))}
      </div>
    </Tree.Root>
  );
};
