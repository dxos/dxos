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
import { arrayMove } from '@dxos/util';

import { NavTree } from './NavTree';
import type { NavTreeContextType } from './NavTreeContext';
import { DropZone, TestObjectGenerator } from '../testing';
import { type NavTreeActionNode, type NavTreeItemNode, type NavTreeNode } from '../types';
import { getLevel } from '../util';

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

const initialContent = {
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

const getLevelExtrema = (items: NavTreeItemNode[], position: number = 0) => {
  const previousItem = items[position - 1];
  const nextItem = items[position + 1];
  return {
    min: nextItem ? getLevel(nextItem?.path) : 1,
    level: getLevel(items?.[position]?.path),
    max: previousItem ? getLevel(previousItem?.path) + 1 : 1,
  };
};

const StorybookNavTree = ({ id = ROOT_ID }: { id?: string }) => {
  const [open, setOpen] = useState<Set<string>>(new Set());

  const [content, setContent] = useState<StorybookGraphNode>(initialContent);

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

  const resolveItemLevel = useCallback(
    (overPosition: number | undefined, activeId: string | undefined, levelOffset: number) => {
      if (!(typeof overPosition === 'number' && activeId)) {
        return 1;
      } else {
        const nextItems = arrayMove(
          items,
          items.findIndex(({ id }) => id === activeId),
          overPosition,
        );
        const { min, max, level } = getLevelExtrema(nextItems, overPosition);
        return Math.min(max, Math.max(min, level + levelOffset));
      }
    },
    [items],
  );

  // NOTE: Does not handle deep operations.
  const handleDrop = useCallback(
    ({ active, over, operation, details }: MosaicDropEvent<number>) => {
      if (operation === 'copy' || !('path' in active.item)) {
        return null;
      }
      const activeItem = active.item as NavTreeItemNode & { path: NonNullable<NavTreeItemNode['path']> };

      const _activePosition = items.findIndex(({ id }) => id === activeItem.id);
      const overPosition = over.position;

      if (!overPosition) {
        return null;
      }

      // Exit if the item did not move

      // const levelOffset = (details as { levelOffset?: number } | undefined)?.levelOffset ?? 0;
      //
      // const nextItems = arrayMove(items, activePosition, overPosition);
      //
      // const previousItem: NavTreeItemNode | undefined = nextItems[overPosition - 1];
      // const nextItem: NavTreeItemNode | undefined = nextItems[overPosition + 1];

      setContent((nextContent) => {
        // First remove the active node from the graph

        // if (!previousItem) {
        //   Move to be first top-level item
        // }

        // - If previousItem has (or is) a shared parent, do a regular rearrange
        // - If previousItem is one level less and not already active’s parent, move to be its child
        // - If previousItem is the same level and has no shared parent, migrate to its parent,
        // - Otherwise migrate to be the child of nextItem’s parent, before nextItem

        return nextContent;
      });

      return null;
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
      resolveItemLevel={resolveItemLevel}
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
