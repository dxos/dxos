//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { faker } from '@faker-js/faker';
import { Boat, Butterfly, Shrimp, TrainSimple } from '@phosphor-icons/react';
import React, { useCallback, useState } from 'react';

import { DensityProvider, Tooltip } from '@dxos/aurora';
import { type MosaicDropEvent, type MosaicMoveEvent, Path } from '@dxos/aurora-grid/next';
import { Mosaic } from '@dxos/aurora-grid/next';
import { arrayMove } from '@dxos/util';

import { NavTree } from './NavTree';
import { type NavTreeItemData } from './NavTreeItem';
import { TestObjectGenerator } from '../testing';
import type { TreeNode } from '../types';

faker.seed(3);

const ROOT_ID = 'root';

const StorybookNavTree = ({ id = ROOT_ID, debug }: { id?: string; debug?: boolean }) => {
  const [items, setItems] = useState<TreeNode['children']>(() => {
    const generator = new TestObjectGenerator({ types: ['document'] });
    return Array.from({ length: 4 }).map(() => {
      const item = generator.createObject();
      return {
        // TODO(wittjosiah): Object id isn't included in spread data.
        id: item.id,
        ...item,
        label: item.title,
        icon: () => <Shrimp />,
        children: Array.from({ length: 3 }).map(() => {
          const item = generator.createObject();
          return {
            id: item.id,
            ...item,
            label: item.title,
            icon: () => <Butterfly />,
            children: [],
            actions: [
              {
                id: `${item.id}__a1`,
                label: faker.lorem.words(2),
                icon: () => <Boat />,
                invoke: () => {},
                properties: {},
              },
              {
                id: `${item.id}__a2`,
                label: faker.lorem.words(2),
                icon: () => <TrainSimple />,
                invoke: () => {},
                properties: {},
              },
            ],
            properties: {},
          };
        }),
        actions: [
          {
            id: `${item.id}__a1`,
            label: faker.lorem.words(2),
            icon: () => <Boat />,
            invoke: () => {},
            properties: {},
          },
          {
            id: `${item.id}__a2`,
            label: faker.lorem.words(2),
            icon: () => <TrainSimple />,
            invoke: () => {},
            properties: {},
          },
        ],
        properties: {},
      };
    });
  });

  const handleOver = useCallback(({ active, over }: MosaicMoveEvent<number>) => {
    return !(active.path === id && over.path !== id) ? 'adopt' : 'reject';
  }, []);

  // NOTE: Does not handle deep operations.
  const handleDrop = useCallback(
    ({ active, over, operation }: MosaicDropEvent<number>) => {
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
              children.splice(over.position!, 0, (active.item as NavTreeItemData).node);
            } else if (Path.last(over.path) === item.id) {
              children.splice(item.children.length, 0, (active.item as NavTreeItemData).node);
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
      node={{ id: ROOT_ID, label: 'root', children: items, actions: [], properties: {} }}
      onOver={handleOver}
      onDrop={handleDrop}
    />
  );
};

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

export const Default = {
  render: ({ debug }: { debug?: boolean }) => (
    <Mosaic.Root debug={debug}>
      <StorybookNavTree />
      <Mosaic.DragOverlay />
    </Mosaic.Root>
  ),
};
