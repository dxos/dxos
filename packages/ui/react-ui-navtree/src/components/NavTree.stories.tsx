//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { Boat, Butterfly, Shrimp, TrainSimple } from '@phosphor-icons/react';
import React, { useCallback, useState } from 'react';

import { faker } from '@dxos/random';
import { Button, DensityProvider, Tooltip } from '@dxos/react-ui';
import { type MosaicDropEvent, type MosaicMoveEvent, Path } from '@dxos/react-ui-mosaic';
import { Mosaic } from '@dxos/react-ui-mosaic';
import { withTheme } from '@dxos/storybook-utils';
import { arrayMove } from '@dxos/util';

import { NavTree, type NavTreeProps } from './NavTree';
import { type NavTreeItemData } from './NavTreeItem';
import { DropZone, TestObjectGenerator } from '../testing';
import type { TreeNode } from '../types';

faker.seed(3);

const ROOT_ID = 'root';

type StorybookNavTreeProps = Omit<NavTreeProps, 'node'> & { id?: string };

const StorybookNavTree = ({ id = ROOT_ID, ...props }: StorybookNavTreeProps) => {
  const leafItemPathAcc: string[] = [];
  const [items, setItems] = useState<TreeNode['children']>(() => {
    const generator = new TestObjectGenerator({ types: ['document'] });
    return Array.from({ length: 4 }).map(() => {
      const l0 = generator.createObject();
      return {
        // TODO(wittjosiah): Object id isn't included in spread data.
        id: l0.id,
        ...l0,
        label: l0.title,
        icon: () => <Shrimp />,
        children: Array.from({ length: 3 }).map(() => {
          const l1 = generator.createObject();
          leafItemPathAcc.push(Path.create(ROOT_ID, l0.id, l1.id));
          return {
            id: l1.id,
            ...l1,
            label: l1.title,
            icon: () => <Butterfly />,
            children: [],
            actions: [
              {
                id: `${l1.id}__a1`,
                label: faker.lorem.words(2),
                icon: () => <Boat />,
                invoke: () => {},
                properties: {},
              },
              {
                id: `${l1.id}__a2`,
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
            id: `${l0.id}__a1`,
            label: faker.lorem.words(2),
            icon: () => <Boat />,
            invoke: () => {},
            properties: {},
          },
          {
            id: `${l0.id}__a2`,
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

  const [leafItemPaths, _] = useState<string[]>(leafItemPathAcc);

  const [current, setCurrent] = useState<string>(leafItemPaths[0]);

  const handleSelect = useCallback(({ path }: { path: string }) => {
    setCurrent(path);
  }, []);

  const handleOver = useCallback(({ active, over }: MosaicMoveEvent<number>) => {
    return !(active.path === id && over.path !== id) ? 'transfer' : 'reject';
  }, []);

  // NOTE: Does not handle deep operations.
  const handleDrop = useCallback(
    ({ active, over, operation }: MosaicDropEvent<number>) => {
      if (operation === 'copy') {
        return;
      }

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
              children.splice(over.position!, 0, active.item as NavTreeItemData);
            } else if (Path.last(over.path) === item.id) {
              children.splice(item.children.length, 0, active.item as NavTreeItemData);
            }
            return { ...item, children };
          }),
        );
      }
    },
    [items],
  );

  return (
    <>
      <Button
        classNames='fixed block-start-2 inline-end-2'
        onClick={() => {
          const index = leafItemPaths.indexOf(current);
          const nextPath = leafItemPaths[(index + 1) % leafItemPaths.length];
          setCurrent(nextPath);
        }}
      >
        Change current
      </Button>
      <NavTree
        node={{ id: ROOT_ID, label: ROOT_ID, parent: null, children: items, actions: [], properties: {} }}
        current={current}
        onSelect={handleSelect}
        onOver={handleOver}
        onDrop={handleDrop}
        {...props}
      />
    </>
  );
};

export default {
  title: 'react-ui-navtree/NavTree',
  component: NavTree,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    withTheme,
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

export const Copy = {
  render: ({ debug }: { debug?: boolean }) => {
    return (
      <Mosaic.Root debug={debug}>
        <div className='flex'>
          <StorybookNavTree classNames='w-[250px]' />
          <DropZone />
        </div>
        <Mosaic.DragOverlay />
      </Mosaic.Root>
    );
  },
};
