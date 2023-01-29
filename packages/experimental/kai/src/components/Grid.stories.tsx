//
// Copyright 2023 DXOS.org
//

import faker from 'faker';
import React from 'react';
import { useResizeDetector } from 'react-resize-detector';

import { range } from '@dxos/util';
import '@dxosTheme';

import { Bounds, Grid, Item } from './Grid';

export default {
  component: Grid,
  argTypes: {}
};

faker.seed(100);

// TODO(burdon): Grid class.
// TODO(burdon): Border (inset). Set position.
const snapper = (n: number, s: number) => Math.floor(n / s) * s;

const items: Item[] = range(50).map((i) => ({ id: String(i), label: `${i}` }));

// TODO(burdon): Zoom to cell.
// TODO(burdon): Test containers with nested transform/scaled.

// TODO(burdon): Test drag-and-drop.
// TODO(burdon): Test animate move.
// TODO(burdon): Hierarchical data model.
// TODO(burdon): SVG connection points.
// TODO(burdon): Layout with precise positioning (fractions). Snap grid.
// TODO(burdon): Draw grid.

const Test = () => {
  const { ref: containerRef, width, height } = useResizeDetector();

  const size = 120;
  const snap = (n: number) => snapper(n, size);

  // TODO(burdon): Layout class.
  // TODO(burdon): Grid vs. size.
  const layout =
    width && height
      ? (item: Item): Bounds => ({
          x: snap(faker.datatype.number(width)),
          y: snap(faker.datatype.number(height)),
          width: size + 1,
          height: size + 1
        })
      : undefined;

  const handleSelect = (item: Item) => {
    console.log(item);
  };

  return (
    <div ref={containerRef} className='absolute flex left-0 right-0 top-0 bottom-0'>
      <div className='flex flex-1 overflow-auto bg-gray-500'>
        <Grid items={items} layout={layout} onSelect={handleSelect} />
      </div>
    </div>
  );
};

export const Default = {
  render: () => <Test />
};
