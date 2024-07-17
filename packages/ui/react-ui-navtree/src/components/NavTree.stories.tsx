//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React, { useCallback, useState } from 'react';

import { faker } from '@dxos/random';
import { Tooltip } from '@dxos/react-ui';
import { type MosaicDropEvent, type MosaicMoveEvent } from '@dxos/react-ui-mosaic';
import { Mosaic } from '@dxos/react-ui-mosaic';
import { withTheme } from '@dxos/storybook-utils';

import { NavTree } from './NavTree';
import type { NavTreeContextType } from './NavTreeContext';
import { DropZone, TestObjectGenerator } from '../testing';
import { type NavTreeActionNode, type NavTreeItemNode, type NavTreeNode } from '../types';

faker.seed(1234);

type StorybookGraphNode = NavTreeNode & { actions?: NavTreeActionNode[] };

function* visitor(
  node: StorybookGraphNode,
  isOpen?: (node: StorybookGraphNode) => boolean,
): Generator<NavTreeItemNode<StorybookGraphNode>> {
  const stack: NavTreeItemNode<StorybookGraphNode>[] = [
    {
      id: node.id,
      node,
      path: [node.id],
      parentOf: (node.nodes ?? []).map(({ id }) => id),
      actions: node.actions,
    },
  ];
  while (stack.length > 0) {
    const { node, path, parentOf, actions } = stack.pop()!;
    if ((path?.length ?? 0) > 1) {
      yield { id: node.id, node, path, parentOf, actions };
    }

    const children = Array.from(node.nodes ?? []);
    if ((path?.length ?? 0) === 1 || isOpen?.(node)) {
      for (let i = children.length - 1; i >= 0; i--) {
        const child = children[i];
        stack.push({
          id: child.id,
          node: child,
          path: path ? [...path, child.id] : [child.id],
          ...((child.nodes?.length ?? 0) > 0 && {
            parentOf: child.nodes!.map(({ id }) => id),
          }),
          actions: (child as StorybookGraphNode).actions,
        });
      }
    }
  }
}

const ROOT_ID = 'root';

const generator = new TestObjectGenerator({ types: ['document'] });

const content = {
  id: 'root',
  nodes: [...Array(4)].map(() => {
    const l0 = generator.createObject();
    return {
      id: faker.string.uuid(),
      properties: {
        label: l0.title,
        iconSymbol: 'ph--horse--regular',
      },
      nodes: [...Array(4)].map(() => {
        const l1 = generator.createObject();
        return {
          id: faker.string.uuid(),
          properties: {
            label: l1.title,
            iconSymbol: 'ph--butterfly--regular',
          },
          actions: [
            {
              id: `${faker.string.uuid()}__a1`,
              invoke: () => {},
              properties: {
                label: faker.lorem.words(2),
                iconSymbol: 'ph--boat--regular',
              },
            },
            {
              id: `${faker.string.uuid()}__a2`,
              invoke: () => {},
              properties: {
                label: faker.lorem.words(2),
                iconSymbol: 'ph--train-simple--regular',
              },
            },
          ],
        } satisfies StorybookGraphNode;
      }),
      actions: [
        {
          id: `${faker.string.uuid()}__a1`,
          invoke: () => {},
          properties: {
            label: faker.lorem.words(2),
            iconSymbol: 'ph--boat--regular',
          },
        },
        {
          id: `${faker.string.uuid()}__a2`,
          invoke: () => {},
          properties: {
            label: faker.lorem.words(2),
            iconSymbol: 'ph--train-simple--regular',
          },
        },
      ],
    } satisfies StorybookGraphNode;
  }),
};

const StorybookNavTree = ({ id = ROOT_ID }: { id?: string }) => {
  const [open, setOpen] = useState<Set<string>>(new Set());

  const [items, setItems] = useState<NavTreeItemNode[]>(() => {
    return Array.from(visitor(content, ({ id }) => open.has(id)));
  });

  const onItemOpenChange = useCallback<NonNullable<NavTreeContextType['onItemOpenChange']>>(
    (item, nextItemOpen) => {
      open[nextItemOpen ? 'add' : 'delete'](item.id);
      const nextOpen = new Set(Array.from(open));
      const nextItems = Array.from(visitor(content, ({ id }) => nextOpen.has(id)));
      setOpen(nextOpen);
      setItems(nextItems);
    },
    [open, content],
  );

  const [current, setCurrent] = useState<Set<string>>(new Set());

  const handleSelect = useCallback(({ id }: NavTreeItemNode) => {
    setCurrent(new Set([id]));
  }, []);

  const handleOver = useCallback(({ active, over }: MosaicMoveEvent<number>) => {
    return !(active.path === id && over.path !== id) ? 'transfer' : 'reject';
  }, []);

  // NOTE: Does not handle deep operations.
  const handleDrop = useCallback(
    ({ active, over, operation }: MosaicDropEvent<number>) => {
      // TODO(thure): Implement
      // if (operation === 'copy') {
      //   return;
      // }
      // if (active.path === Path.create(id, active.item.id)) {
      //   setItems((items) => {
      //     const activeIndex = items.findIndex((item) => item.id === active.item.id);
      //     const overIndex = items.findIndex((item) => item.id === over.item.id);
      //     return [...arrayMove(items, activeIndex, overIndex)];
      //   });
      // } else {
      //   setItems((items) =>
      //     items.map((item) => {
      //       const children = [...item.children];
      //       if (Path.last(Path.parent(active.path)) === item.id) {
      //         children.splice(active.position!, 1);
      //       }
      //       if (Path.last(Path.parent(over.path)) === item.id) {
      //         children.splice(over.position!, 0, active.item as NavTreeItemData);
      //       } else if (Path.last(over.path) === item.id) {
      //         children.splice(item.children.length, 0, active.item as NavTreeItemData);
      //       }
      //       return { ...item, children };
      //     }),
      //   );
      // }
    },
    [items],
  );

  return (
    <NavTree
      id={ROOT_ID}
      items={items}
      current={current}
      onItemOpenChange={onItemOpenChange}
      open={open}
      onNavigate={handleSelect}
      onOver={handleOver}
      onDrop={handleDrop}
    />
  );
};

export default {
  title: 'react-ui-navtree/NavTree',
  component: NavTree,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [withTheme],
};

export const Default = {
  render: () => (
    <Tooltip.Provider>
      <Mosaic.Root>
        <StorybookNavTree />
        <Mosaic.DragOverlay />
      </Mosaic.Root>
    </Tooltip.Provider>
  ),
};

export const Copy = {
  render: () => {
    return (
      <Tooltip.Provider>
        <Mosaic.Root>
          <div className='flex'>
            <StorybookNavTree />
            <DropZone />
          </div>
          <Mosaic.DragOverlay />
        </Mosaic.Root>
      </Tooltip.Provider>
    );
  },
};
