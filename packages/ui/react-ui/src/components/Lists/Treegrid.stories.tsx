//
// Copyright 2024 DXOS.org
//
import React from 'react';

import { faker } from '@dxos/random';

import { Treegrid as Tg } from './Treegrid';
import { withTheme } from '../../testing';

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
} satisfies StorybookNode;

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

const StorybookTreegrid = () => {
  return (
    <Tg.Root gridTemplateColumns='1fr'>
      {flattenedContent.map(({ node, parentOf, path }) => {
        return (
          <Tg.Row
            key={node.id}
            id={node.id}
            path={path.join(Tg.PATH_SEPARATOR)}
            {...(parentOf && { parentOf: parentOf.join(Tg.PARENT_OF_SEPARATOR) })}
          >
            <Tg.Cell indent classNames='flex items-center'>
              {node.icon && (
                <svg className='is-[1em] bs-[1em] mlb-1'>
                  <use href={`/icons.svg#${node.icon}`} />
                </svg>
              )}
              {node.title}
            </Tg.Cell>
          </Tg.Row>
        );
      })}
    </Tg.Root>
  );
};

export default {
  title: 'react-ui/Treegrid',
  component: StorybookTreegrid,
  decorators: [withTheme],
};

export const Treegrid = () => <StorybookTreegrid />;
