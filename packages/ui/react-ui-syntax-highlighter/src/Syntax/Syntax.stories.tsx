//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { random } from '@dxos/random';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { trim } from '@dxos/util';

import { Syntax } from './Syntax';

random.seed(0);

const createNode = () => {
  const data: Record<string, any> = {};
  const keys = [...Array(random.number.int({ min: 1, max: 5 }))].map(() => random.lorem.word());
  keys.forEach((key) => {
    switch (random.helpers.arrayElement(['object', 'string', 'number', 'boolean', 'null'])) {
      case 'object':
        data[key] = createNode();
        break;
      case 'string':
        data[key] = random.lorem.word();
        break;
      case 'number':
        data[key] = random.number.int();
        break;
      case 'boolean':
        data[key] = random.datatype.boolean();
        break;
      case 'null':
        data[key] = null;
        break;
    }
  });
  return data;
};

const createData = ({ depth = 2, children = 3 } = {}): any => {
  const createChildren = (root: any, d = 0) => {
    if (d < depth) {
      const num = random.number.int({ min: 1, max: Math.round(Math.log(depth + 1 - d) * children) });
      root.children = [...new Array(num)].map(() => createChildren(createNode(), d + 1));
    }
    return root;
  };
  return createChildren(createNode());
};

const meta = {
  title: 'ui/react-ui-syntax-highlighter/Syntax',
  component: Syntax.Root,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

/** JSON composite with filter and scrolling viewport. */
export const Json: Story = {
  render: (args) => (
    <Syntax.Root {...args}>
      <Syntax.Content>
        <Syntax.Filter />
        <Syntax.Viewport>
          <Syntax.Code />
        </Syntax.Viewport>
      </Syntax.Content>
    </Syntax.Root>
  ),
  args: {
    data: createData({ depth: 5 }),
    replacer: { maxDepth: 3, maxArrayLen: 10, maxStringLen: 10 },
  } as any,
};

/** Text composite (TypeScript source) with scrolling viewport and no filter. */
export const Text: Story = {
  render: (args) => (
    <Syntax.Root {...args}>
      <Syntax.Viewport>
        <Syntax.Code />
      </Syntax.Viewport>
    </Syntax.Root>
  ),
  args: {
    language: 'tsx',
    source: trim`
      import React from 'react'

      const Test = () => {
        return <div>Test</div>
      }
    `,
  } as any,
};
