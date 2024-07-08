//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { House, List, Planet, PlusCircle, Sailboat } from '@phosphor-icons/react';
import React, { type PropsWithChildren, useEffect, useState } from 'react';

import { PublicKey } from '@dxos/keys';
import { DensityProvider } from '@dxos/react-ui';
import { modalSurface, mx } from '@dxos/react-ui-theme';
import { withTheme } from '@dxos/storybook-utils';

import { type ItemMap, Tree, type TreeNodeData, type TreeProps, visitNodes } from './Tree';

export default {
  title: 'plugin-navtree/Tree',
  component: Tree,
  decorators: [withTheme],
  parameters: {
    layout: 'fullscreen',
  },
};

// TODO(burdon): Order of hooks error!

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
// TODO(burdon): Horizontal scrolling within navtree?
const Container = ({ children, sidebar }: PropsWithChildren<{ sidebar: JSX.Element }>) => {
  return (
    <DensityProvider density='fine'>
      <div className={mx('_absolute _inset-0 _flex', modalSurface)}>
        <div className='flex flex-col overflow-y-auto w-[300px] bg-neutral-100 dark:bg-neutral-800'>{sidebar}</div>
        <div className='flex flex-col grow overflow-hidden'>{children}</div>
      </div>
    </DensityProvider>
  );
};

// TODO(burdon): Generate.
const data: TreeNodeData[] = [
  {
    id: 'root',
    title: 'Root',
    children: [
      {
        id: 'item-1',
        title: 'Personal Space',
        color: 'text-green-400',
        Icon: House,
        children: [
          {
            id: 'item-1.1',
            title: 'Item 1.1',
          },
          {
            id: 'item-1.2',
            title: 'Item 1.2',
          },
          {
            id: 'item-1.3',
            title: 'Item 1.3',
            children: [
              {
                id: 'item-1.3.1',
                title: 'Item 1.3.1',
                children: [
                  {
                    id: 'item-1.3.1.1',
                    title: 'Item 1.3.1.1',
                  },
                  {
                    id: 'item-1.3.1.2',
                    title: 'Item 1.3.1.2',
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        id: 'item-2',
        title: 'Space 2',
        Icon: Planet,
        children: [
          {
            id: 'item-2.1',
            title: 'Item 2.1',
          },
        ],
      },
      {
        id: 'item-3',
        title: 'Space 3',
        color: 'text-blue-400',
        Icon: Sailboat,
      },
      {
        id: 'item-4',
        title: 'Space 4',
        Icon: Planet,
      },
    ],
  },
];

export const Default = () => {
  return <Container sidebar={<Sidebar mutate />} />;
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
              active[node.id] = Math.random() > 0.7;
            }
          });
          return { ...active };
        });
      }, 5_000);
      return () => clearInterval(t);
    }
  }, []);

  // TODO(burdon): Called twice!
  const handleCreateItem: TreeProps['onMenuAction'] = (id, action) => {
    setItems((items) => {
      let parent: TreeNodeData | undefined;
      visitNodes(root, (node) => {
        if (node.id === id) {
          parent = node;
        }
      });

      (parent!.children ??= []).push({
        id: PublicKey.random().toString(),
        title: `Item ${PublicKey.random().truncate()}`,
      });

      return { ...items };
    });
  };

  const handleCreateSpace = () => {
    setItems((items) => {
      items[0].children?.push({
        id: PublicKey.random().toString(),
        Icon: Planet,
        title: `Space ${PublicKey.random().truncate()}`,
      });

      return { ...items };
    });
  };

  return (
    <div>
      <div></div>

      <Tree
        className='p-0.5 gap-1'
        node={root}
        open={openItems}
        selected={selectedItems}
        active={activeItems}
        onChangeOpen={(id, open) => setOpenItems((items) => ({ ...items, [id]: open }))}
        onChangeSelected={(id, open) => setSelectedItems((items) => ({ ...items, [id]: open }))}
        onMenuAction={handleCreateItem}
        getSlots={(node, open, depth) => {
          if (depth === 1) {
            return {
              root: 'rounded bg-white dark:bg-neutral-850',
              header: mx('rounded-t bg-neutral-50 dark:bg-neutral-900', !open && 'rounded-b'),
            };
          }
        }}
      />

      <div className='flex items-center mt-2 px-2 gap-2'>
        <PlusCircle onClick={handleCreateSpace} />
        <span className='grow' onClick={handleCreateSpace}>
          New space
        </span>
        <List />
      </div>
    </div>
  );
};
