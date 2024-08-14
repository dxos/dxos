//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React from 'react';

import { faker } from '@dxos/random';
import { withFullscreen, withTheme } from '@dxos/storybook-utils';

import { Tree } from './Tree';
import { DemoTree, type DemoTreeProps } from './testing';
import { Mosaic } from '../../mosaic';
import { TestObjectGenerator } from '../../testing';

faker.seed(3);
const generator = new TestObjectGenerator({ types: ['document', 'image'] });

const count = 5;

// TODO(burdon): Move to testing.
const testItems1 = Array.from({ length: count }).map((_, i) => ({
  id: `branch-${i}`,
  label: `Branch ${i}`,
  children: Array.from({ length: i === count - 1 ? 0 : 5 - i }).map(() => {
    const item = generator.createObject();
    return {
      id: item.id,
      label: item.title, // TODO(burdon): Lens.
      children: [],
    };
  }),
}));

const testItems2 = [
  {
    id: 'Home',
    children: [],
  },
  {
    id: 'Collections',
    children: [
      { id: 'Spring', children: [] },
      { id: 'Summer', children: [] },
      { id: 'Fall', children: [] },
      { id: 'Winter', children: [] },
    ],
  },
  {
    id: 'About Us',
    children: [],
  },
  {
    id: 'My Account',
    children: [
      { id: 'Addresses', children: [] },
      {
        id: 'Order History',
        children: [
          { id: 'Order 1', children: [] },
          { id: 'Order 2', children: [] },
          { id: 'Order 3', children: [] },
        ],
      },
      { id: 'Payment Methods', children: [] },
      { id: 'Account Details', children: [] },
    ],
  },
];

export default {
  title: 'react-ui-mosaic/Tree',
  component: Tree,
  render: (args: DemoTreeProps) => {
    return (
      <Mosaic.Root debug={args.debug}>
        <Mosaic.DragOverlay />
        <DemoTree {...args} />
      </Mosaic.Root>
    );
  },
  decorators: [withTheme, withFullscreen()],
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default = {
  args: { initialItems: testItems1, debug: true },
};

export const Deep = {
  args: { initialItems: testItems2 },
};
