//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { faker } from '@faker-js/faker';
import React from 'react';

import { Grid, GridLayout } from './Grid';
import { DemoGrid } from './testing';
import { Mosaic } from '../../mosaic';
import { FullscreenDecorator, TestObjectGenerator } from '../../testing';

faker.seed(99);

const debug = true;

const size = { x: 8, y: 8 };
const generator = new TestObjectGenerator({ types: ['document', 'image'] });
const testItems = generator.createObjects({ length: 20 });
const testLayout = testItems.reduce<GridLayout>((map, item) => {
  map[item.id] = { x: faker.number.int({ min: 0, max: size.x - 1 }), y: faker.number.int({ min: 0, max: size.y - 1 }) };
  return map;
}, {});

export default {
  component: Grid,
  render: () => {
    return (
      <Mosaic.Root debug={debug}>
        <Mosaic.DragOverlay />
        <DemoGrid id='grid' size={size} initialItems={testItems} initialLayout={testLayout} debug={debug} />
      </Mosaic.Root>
    );
  },
  decorators: [FullscreenDecorator()],
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default = {};
