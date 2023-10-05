//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React, { FC, HTMLAttributes, useCallback, useState } from 'react';

import { TestComponentProps } from './test';
import { MosaicMoveEvent, Path, useSortedItems } from '../../dnd';
import { arrayMove } from '../../mosaic';
import { createItem } from '../../testing';
import { Tree, TreeData } from '../Tree';

export const DemoTree: FC<TestComponentProps<any> & HTMLAttributes<HTMLDivElement>> = ({
  id,
  types,
  debug,
  className,
}) => {
  const [items, setItems] = useState<TreeData[]>(() =>
    Array.from({ length: 4 }).map(() => {
      const item = createItem(types);
      return {
        ...item,
        label: item.title,
        children: Array.from({ length: 3 }).map(() => {
          const item = createItem(types);
          return {
            ...item,
            label: item.title,
            children: [],
          };
        }),
      };
    }),
  );

  const sortedItems = useSortedItems({ container: id, items });

  const handleDrop = useCallback(
    ({ active, over }: MosaicMoveEvent<number>) => {
      console.log({ id, active, over });
      if (active.container === id && over.container === id) {
        setItems((items) => {
          const activeIndex = items.findIndex((item) => item.id === active.item.id);
          const overIndex = items.findIndex((item) => item.id === over.item.id);
          return [...arrayMove(items, activeIndex, overIndex)];
        });
      } else if (active.container === id && over.container !== id) {
        setItems((items) => items.filter((item) => item.id !== active.item.id));
      } else if (active.container !== id && over.container === id) {
        setItems((items) => {
          items.splice(over.position!, 0, active.item as TreeData);
          return items;
        });
      } else {
        setItems((items) =>
          items.map((item) => {
            const children = [...item.children];
            if (Path.last(active.container) === item.id) {
              children.splice(active.position!, 1);
            }
            if (Path.last(over.container) === item.id) {
              children.splice(over.position!, 0, active.item as TreeData);
            }
            return { ...item, children };
          }),
        );
      }
    },
    [items],
  );

  return (
    <Tree.Root id={id} items={sortedItems} onDrop={handleDrop} className={className} debug={debug}>
      {sortedItems.map((item, index) => (
        <Tree.Tile key={item.id} item={item} index={index} />
      ))}
    </Tree.Root>
  );
};
