//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { random } from '@dxos/random';
import { Icon } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { TREEGRID_PARENT_OF_SEPARATOR, TREEGRID_PATH_SEPARATOR, Treegrid } from './Treegrid';

random.seed(1234);

type StorybookNode = {
  id: string;
  title: string;
  icon?: string;
  nodes?: StorybookNode[];
};

type StorybookIteratorNode = {
  node: StorybookNode;
  path: string[];
  parentOf?: string[];
};

const content = {
  id: 'root',
  title: 'Root',
  nodes: [
    {
      id: random.string.uuid(),
      title: 'Personal Space',
      icon: 'ph--house--regular',
      nodes: [
        { id: random.string.uuid(), title: random.commerce.productName() },
        { id: random.string.uuid(), title: random.commerce.productName() },
        {
          id: random.string.uuid(),
          title: random.commerce.productName(),
          nodes: [
            {
              id: random.string.uuid(),
              title: random.commerce.productName(),
              nodes: [
                { id: random.string.uuid(), title: random.commerce.productName() },
                { id: random.string.uuid(), title: random.commerce.productName() },
              ],
            },
          ],
        },
      ],
    },
    {
      id: random.string.uuid(),
      title: random.commerce.productName(),
      icon: 'ph--planet--regular',
      nodes: [{ id: random.string.uuid(), title: random.commerce.productName() }],
    },
    { id: random.string.uuid(), title: random.commerce.productName(), icon: 'ph--sailboat--regular' },
    { id: random.string.uuid(), title: random.commerce.productName(), icon: 'ph--planet--regular' },
  ],
} as StorybookNode;

function* visitor(node: StorybookNode, isOpen?: (node: StorybookNode) => boolean): Generator<StorybookIteratorNode> {
  // `parentOf` must reference rows by their full path-based id (the row's DOM id) so `aria-owns` resolves.
  const stack: StorybookIteratorNode[] = [
    {
      node,
      path: [node.id],
      parentOf: (node.nodes ?? []).map(({ id }) => [node.id, id].join(TREEGRID_PATH_SEPARATOR)),
    },
  ];
  while (stack.length > 0) {
    const { node, path, parentOf } = stack.pop()!;
    if (path.length > 1) {
      yield { node, path, parentOf };
    }

    const children = Array.from(node.nodes ?? []);
    if (path.length === 1 || isOpen?.(node)) {
      for (let i = children.length - 1; i >= 0; i--) {
        const child = children[i];
        const childPath = [...path, child.id];
        stack.push({
          node: child,
          path: childPath,
          ...((child.nodes?.length ?? 0) > 0 && {
            parentOf: child.nodes!.map(({ id }) => [...childPath, id].join(TREEGRID_PATH_SEPARATOR)),
          }),
        });
      }
    }
  }
}

const flattenedContent = Array.from(visitor(content, () => true));

const DefaultStory = () => (
  <Treegrid.Root gridTemplateColumns='1fr'>
    {flattenedContent.map(({ node, parentOf, path }) => (
      <Treegrid.Row
        key={node.id}
        id={path.join(TREEGRID_PATH_SEPARATOR)}
        {...(parentOf && { parentOf: parentOf.join(TREEGRID_PARENT_OF_SEPARATOR) })}
      >
        <Treegrid.Cell indent classNames='flex items-center'>
          {node.icon && <Icon icon={node.icon} classNames='w-[1em] h-[1em] my-1' />}
          {node.title}
        </Treegrid.Cell>
      </Treegrid.Row>
    ))}
  </Treegrid.Root>
);

const meta = {
  title: 'ui/react-ui-list/Treegrid',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
