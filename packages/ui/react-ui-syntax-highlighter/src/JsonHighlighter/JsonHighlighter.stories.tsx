//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { random } from '@dxos/random';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { JsonHighlighter } from './JsonHighlighter';

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

const createCycle = () => {
  const data: any = { a: 1, b: [] };
  data.b.push(data);
  return data;
};

const meta = {
  title: 'ui/react-ui-syntax-highlighter/JsonHighlighter',
  component: JsonHighlighter,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
} satisfies Meta<typeof JsonHighlighter>;

export default meta;

type Story = StoryObj<typeof JsonHighlighter>;

export const Default: Story = {
  args: {
    data: createNode(),
  },
};

export const Cycle: Story = {
  args: {
    data: createCycle(),
  },
};
