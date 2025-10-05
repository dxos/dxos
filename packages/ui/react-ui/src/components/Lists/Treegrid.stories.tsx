//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { faker } from '@dxos/random';
import { withTheme } from '@dxos/storybook-utils';

import { Icon } from '../Icon';

import { Treegrid } from './Treegrid';

faker.seed(1234);

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
      id: faker.string.uuid(),
      title: 'Personal Space',
      icon: 'ph--house--regular',
      nodes: [
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
          nodes: [
            {
              id: faker.string.uuid(),
              title: faker.commerce.productName(),
              nodes: [
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
      icon: 'ph--planet--regular',
      nodes: [
        {
          id: faker.string.uuid(),
          title: faker.commerce.productName(),
        },
      ],
    },
    {
      id: faker.string.uuid(),
      title: faker.commerce.productName(),
      icon: 'ph--sailboat--regular',
    },
    {
      id: faker.string.uuid(),
      title: faker.commerce.productName(),
      icon: 'ph--planet--regular',
    },
  ],
} as StorybookNode;

function* visitor(node: StorybookNode, isOpen?: (node: StorybookNode) => boolean): Generator<StorybookIteratorNode> {
  const stack: StorybookIteratorNode[] = [
    {
      node,
      path: [node.id],
      parentOf: (node.nodes ?? []).map(({ id }) => id),
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
        stack.push({
          node: child,
          path: [...path, child.id],
          ...((child.nodes?.length ?? 0) > 0 && {
            parentOf: child.nodes!.map(({ id }) => id),
          }),
        });
      }
    }
  }
}

const flattenedContent = Array.from(visitor(content, () => true));

const DefaultStory = () => {
  return (
    <Treegrid.Root gridTemplateColumns='1fr'>
      {flattenedContent.map(({ node, parentOf, path }) => {
        return (
          <Treegrid.Row
            key={node.id}
            id={path.join(Treegrid.PATH_SEPARATOR)}
            {...(parentOf && { parentOf: parentOf.join(Treegrid.PARENT_OF_SEPARATOR) })}
          >
            <Treegrid.Cell indent classNames='flex items-center'>
              {node.icon && <Icon icon={node.icon} classNames='is-[1em] bs-[1em] mlb-1' />}
              {node.title}
            </Treegrid.Cell>
          </Treegrid.Row>
        );
      })}
    </Treegrid.Root>
  );
};

const meta = {
  title: 'ui/react-ui-core/Treegrid',
  component: Treegrid.Root as any,
  render: DefaultStory,
  decorators: [withTheme],
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
