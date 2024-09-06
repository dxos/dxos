//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { House, List, Planet, PlusCircle, Sailboat } from '@phosphor-icons/react';
import React, { type JSX, type PropsWithChildren, useEffect, useState } from 'react';

import { faker } from '@dxos/random';
import { modalSurface, mx } from '@dxos/react-ui-theme';
import { withFullscreen, withTheme } from '@dxos/storybook-utils';

import { type ItemMap, Tree, type TreeNodeData, type TreeProps, visitNodes, visitor } from './Tree';

faker.seed(1234);

export default {
  title: 'plugin-navtree/Tree',
  component: Tree,
  decorators: [withTheme, withFullscreen({ classNames: modalSurface })],
};

/**
 * Space:
 * - Space panels are separated from each other to give them more weight than folders.
 * - Private space isn't different (just first, different icon).
 * - Edit titles in place.
 *
 * Navigation:
 *  - up/down across spaces/folder peers
 *  - right to enter space/folder children
 *  - left to parent
 */
const Container = ({ children, sidebar }: PropsWithChildren<{ sidebar: JSX.Element }>) => {
  return (
    <div className='flex'>
      {/* TODO(burdon): Custom thin scrollbar. */}
      {/* TODO(burdon): Horizontal scrolling within navtree? */}
      <div className='flex flex-col overflow-y-auto w-[300px] bg-neutral-100 dark:bg-neutral-950'>{sidebar}</div>
      <div className='flex flex-col grow overflow-hidden'>{children}</div>
    </div>
  );
};

// TODO(burdon): Generate.
const data: TreeNodeData[] = [
  {
    id: 'root',
    title: 'Root',
    children: [
      {
        id: faker.string.uuid(),
        title: 'Personal Space',
        color: 'text-green-400',
        Icon: House,
        children: [
          {
            id: faker.string.uuid(),
            title: faker.commerce.productName(),
          },
          {
            id: faker.string.uuid(),
            title: faker.commerce.productName(),
          },
          {
            id: faker.string.uuid(),
            title: faker.commerce.productName(),
            children: [
              {
                id: faker.string.uuid(),
                title: faker.commerce.productName(),
                children: [
                  {
                    id: faker.string.uuid(),
                    title: faker.commerce.productName(),
                  },
                  {
                    id: faker.string.uuid(),
                    title: faker.commerce.productName(),
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        id: faker.string.uuid(),
        title: faker.commerce.productName(),
        Icon: Planet,
        children: [
          {
            id: faker.string.uuid(),
            title: faker.commerce.productName(),
          },
        ],
      },
      {
        id: faker.string.uuid(),
        title: faker.commerce.productName(),
        Icon: Sailboat,
      },
      {
        id: faker.string.uuid(),
        title: faker.commerce.productName(),
        Icon: Planet,
      },
    ],
  },
];

export const Default = () => {
  return <Container sidebar={<Sidebar mutate />} />;
};

export const Visitor = () => {
  const [items] = useState(data);
  const root = items[0];
  const [openItems] = useState<ItemMap>({ [root.children![0].id]: true });
  return (
    <div className='flex flex-col'>
      {Array.from(visitor(root, openItems)).map(({ node: { id, title }, depth }) => (
        <div key={id} className='grid grid-cols-[40px_400px_400px] font-mono'>
          <div>{depth}</div>
          <div>{id}</div>
          <div>{title}</div>
        </div>
      ))}
    </div>
  );
};

const Sidebar = ({ mutate }: { mutate?: boolean }) => {
  const [items, setItems] = useState(data);
  const root = items[0];
  const [openItems, setOpenItems] = useState<ItemMap>({ [root.children![0].id]: true });
  const [selectedItems, setSelectedItems] = useState<ItemMap>({});
  const [activeItems, setActiveItems] = useState<ItemMap>(() => {
    const active: ItemMap = {};
    visitNodes(root, (node, depth) => {
      if (depth > 1 && Math.random() > 0.6) {
        active[node.id] = true;
      }
    });
    return active;
  });

  useEffect(() => {
    if (mutate) {
      const t = setInterval(() => {
        setActiveItems((active) => {
          visitNodes(root, (node, depth) => {
            if (depth > 1) {
              active[node.id] = active[node.id] ? Math.random() > 0.4 : Math.random() > 0.7;
            }
          });
          return { ...active };
        });
      }, 5_000);
      return () => clearInterval(t);
    }
  }, []);

  const handleCreateItem: TreeProps['onMenuAction'] = (id, action) => {
    setItems((items) => {
      let parent: TreeNodeData | undefined;
      visitNodes(root, (node) => {
        if (node.id === id) {
          parent = node;
        }
      });

      (parent!.children ??= []).push({
        id: faker.string.uuid(),
        title: faker.commerce.productName(),
      });

      setOpenItems((open) => ({ ...open, [parent!.id]: true }));

      return { ...items };
    });
  };

  const handleCreateSpace = () => {
    setItems((items) => {
      items[0].children?.push({
        id: faker.string.uuid(),
        Icon: Planet,
        title: faker.commerce.productName(),
      });

      return { ...items };
    });
  };

  return (
    <div className='flex flex-col overflow-hidden'>
      <div className='flex flex-col overflow-y-auto'>
        <Tree
          className='p-0.5 gap-1'
          node={root}
          open={openItems}
          selected={selectedItems}
          active={activeItems}
          onChangeOpen={(id, open) => setOpenItems((items) => ({ ...items, [id]: open }))}
          onChangeSelected={(id, open) => setSelectedItems((items) => ({ ...items, [id]: open }))}
          onMenuAction={handleCreateItem}
          getSlots={(node, open, depth, ancestors) => {
            if (depth === 1) {
              return {
                root: 'rounded bg-white dark:bg-neutral-850',
                header: mx('rounded-t bg-neutral-50 dark:bg-neutral-900', !open && 'rounded-b'),
              };
            }
          }}
        />
      </div>

      <div className='flex items-center my-2 px-2 gap-2'>
        <PlusCircle onClick={handleCreateSpace} />
        <span className='grow text-sm' onClick={handleCreateSpace}>
          New space
        </span>
        <List />
      </div>
    </div>
  );
};
