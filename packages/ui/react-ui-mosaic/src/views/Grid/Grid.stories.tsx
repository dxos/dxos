//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { faker } from '@faker-js/faker';
import React from 'react';

import { Grid, type GridLayout } from './Grid';
import { DemoGrid } from './testing';
import { Mosaic } from '../../mosaic';
import { FullscreenDecorator, TestObjectGenerator } from '../../testing';

faker.seed(99);

const debug = true;

// TODO(burdon): Create object.
// TODO(burdon): Delete object (delete/remove from grid).
// TODO(burdon): Editable cards (and other card stories).
// TODO(burdon): Search story (drag from search stack).

const size = { x: 4, y: 4 };
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
        <DemoGrid id='grid' options={{ size }} initialItems={testItems} initialLayout={testLayout} />
      </Mosaic.Root>
    );
  },
  decorators: [FullscreenDecorator()],
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default = {};
