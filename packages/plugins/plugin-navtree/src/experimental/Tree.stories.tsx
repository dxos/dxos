//
// Copyright 2023 DXOS.org
//

import { type Meta } from '@storybook/react-vite';
import React, { useEffect, useState } from 'react';

import { faker } from '@dxos/random';
import { Icon, IconButton, Layout, ScrollArea } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { mx } from '@dxos/ui-theme';

import { type ItemMap, Tree, type TreeNodeData, type TreeProps, visitNodes, visitor } from './Tree';

faker.seed(1234);

// TODO(burdon): Generate.
const data: TreeNodeData[] = [
  {
    id: 'root',
    title: 'plugins/Root',
    children: [
      {
        id: faker.string.uuid(),
        title: 'plugins/Personal Space',
        color: 'text-green-400',
        iconName: 'ph--house--regular',
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
        iconName: 'ph--planet--regular',
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
        iconName: 'ph--sailboat--regular',
      },
      {
        id: faker.string.uuid(),
        title: faker.commerce.productName(),
        iconName: 'ph--planet--regular',
      },
    ],
  },
];

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

  const handleCreateItem: TreeProps['onMenuAction'] = (id) => {
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
        iconName: 'ph--planet--regular',
        title: faker.commerce.productName(),
      });

      return { ...items };
    });
  };

  return (
    <Layout.Main>
      <ScrollArea.Root orientation='vertical' thin>
        <ScrollArea.Viewport>
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
                  root: 'rounded-sm bg-white dark:bg-neutral-850',
                  header: mx('rounded-t bg-neutral-50 dark:bg-neutral-900', !open && 'rounded-b'),
                };
              }
            }}
          />
        </ScrollArea.Viewport>
      </ScrollArea.Root>

      <div className='flex items-center my-2 px-2 gap-2'>
        <IconButton icon='ph--plus-circle--regular' iconOnly label='Create space' onClick={handleCreateSpace} />
        <span className='grow text-sm' onClick={handleCreateSpace}>
          New space
        </span>
        <Icon icon='ph--list--regular' />
      </div>
    </Layout.Main>
  );
};

const meta = {
  title: 'plugins/plugin-navtree/experimental/Tree',
  component: Tree,
  decorators: [withTheme(), withLayout({ layout: 'column', classNames: 'inline-[20rem]' })],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof Tree>;

export default meta;

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
export const Default = () => {
  return <Sidebar mutate />;
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
