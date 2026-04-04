//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { faker } from '@dxos/random';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { Json } from './Json';

faker.seed(0);

const createNode = () => {
  const data: Record<string, any> = {};
  const keys = [...Array(faker.number.int({ min: 1, max: 5 }))].map(() => faker.lorem.word());
  keys.forEach((key) => {
    switch (faker.helpers.arrayElement(['object', 'string', 'number', 'boolean', 'null'])) {
      case 'object':
        data[key] = createNode();
        break;
      case 'string':
        data[key] = faker.lorem.word();
        break;
      case 'number':
        data[key] = faker.number.int();
        break;
      case 'boolean':
        data[key] = faker.datatype.boolean();
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
      const num = faker.number.int({ min: 1, max: Math.round(Math.log(depth + 1 - d) * children) });
      root.children = [...new Array(num)].map(() => {
        return createChildren(createNode(), d + 1);
      });
    }

    return root;
  };

  return createChildren(createNode());
};

const createCycle = () => {
  const data: any = {
    a: 1,
    b: [],
  };

  data.b.push(data);
  return data;
};

const meta = {
  title: 'ui/react-ui-syntax-highlighter/Json',
  component: Json.Root,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

/** Standalone Json.Data — simplest usage. */
export const Default: Story = {
  render: (args) => <Json.Data {...args} />,
  args: {
    data: createData(),
  },
};

/** Circular reference handling. */
export const Cycle: Story = {
  render: (args) => <Json.Data {...args} />,
  args: {
    data: createCycle(),
  },
};

/** Large dataset with replacer. */
export const Filter: Story = {
  render: (args) => (
    <Json.Root {...args}>
      <Json.Content>
        <Json.Filter />
        <Json.Data />
      </Json.Content>
    </Json.Root>
  ),
  args: {
    data: createData({ depth: 5 }),
    replacer: { maxDepth: 3, maxArrayLen: 10, maxStringLen: 10 },
  },
};
