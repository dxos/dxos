//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { faker } from '@faker-js/faker';
import React, { useCallback, useState } from 'react';

import { DensityProvider, Tooltip } from '@dxos/aurora';
import { type MosaicDropEvent, type MosaicMoveEvent, Path } from '@dxos/aurora-grid/next';
import { Mosaic } from '@dxos/aurora-grid/next';
import { arrayMove } from '@dxos/util';

import { NavTree } from './NavTree';
import { type TreeNode } from './props';
import { TestObjectGenerator } from '../testing';

faker.seed(3);

export default {
  component: NavTree,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story: any) => (
      <Tooltip.Provider>
        <DensityProvider density='fine'>
          <div role='none' className='p-2'>
            <Story />
          </div>
        </DensityProvider>
      </Tooltip.Provider>
    ),
  ],
};

const StorybookNavTree = ({ id = 'tree', debug }: { id?: string; debug?: boolean }) => {
  const [items, setItems] = useState<TreeNode['children']>(() => {
    const generator = new TestObjectGenerator({ types: ['document'] });
    return Array.from({ length: 4 }).map(() => {
      const item = generator.createObject();
      return {
        // TODO(wittjosiah): Object id isn't included in spread data.
        id: item.id,
        ...item,
        label: item.title,
        children: Array.from({ length: 3 }).map(() => {
          const item = generator.createObject();
          return {
            id: item.id,
            ...item,
            label: item.title,
            children: [],
          };
        }),
      };
    });
  });

  const handleOver = useCallback(({ active, over }: MosaicMoveEvent<number>) => {
    return !(active.path === id && over.path !== id) ? 'adopt' : 'reject';
  }, []);

  // NOTE: Does not handle deep operations.
  const handleDrop = useCallback(
    ({ active, over }: MosaicDropEvent<number>) => {
      if (active.path === Path.create(id, active.item.id)) {
        setItems((items) => {
          const activeIndex = items.findIndex((item) => item.id === active.item.id);
          const overIndex = items.findIndex((item) => item.id === over.item.id);
          return [...arrayMove(items, activeIndex, overIndex)];
        });
      } else {
        setItems((items) =>
          items.map((item) => {
            const children = [...item.children];
            if (Path.last(Path.parent(active.path)) === item.id) {
              children.splice(active.position!, 1);
            }
            if (Path.last(Path.parent(over.path)) === item.id) {
              children.splice(over.position!, 0, active.item as TreeNode);
            }
            return { ...item, children };
          }),
        );
      }
    },
    [items],
  );

  return (
    <NavTree
      id={id}
      node={{ id: 'root', label: 'root', children: items, actions: [] }}
      onOver={handleOver}
      onDrop={handleDrop}
    />
  );
};

export const Default = {
  render: ({ debug }: { debug?: boolean }) => (
    <Mosaic.Root debug={debug}>
      <StorybookNavTree />
      <Mosaic.DragOverlay />
    </Mosaic.Root>
  ),
};
