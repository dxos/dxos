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

// TODO(burdon): Cartesian coordinates.

// TODO(burdon): Test drag-and-drop (with react and d3 libs).
// TODO(burdon): Text editor inside each cell (only editable when focused).

// TODO(burdon): Hierarchical data model (zoom into children then redraw/reset zoom).
// TODO(burdon): Test containers with nested transform/scaled.
// TODO(burdon): Layout class.

// TODO(burdon): SVG connection points.
// TODO(burdon): Draw grid.

// TODO(burdon): Grid class.
// TODO(burdon): Simple card stack on mobile.

const snapper = (n: number, s: number) => Math.floor(n / s) * s;

const Test = () => {
  const { ref: containerRef, width, height } = useResizeDetector();

  const size = 160;
  const padding = 16;
  const num = 20;

  const snap = (n: number) => snapper(n, size + padding);

  const items: Item[] = range(num).map((i) => ({
    id: String(i),
    label: faker.lorem.words(3),
    content: faker.lorem.sentences(faker.datatype.number(3))
  }));

  const layout =
    width && height
      ? (item: Item): Bounds => ({
          x: snap(faker.datatype.number(width)) + padding / 2,
          y: snap(faker.datatype.number(height)) + padding / 2,
          width: size + 1,
          height: size + 1
        })
      : undefined;

  const handleSelect = (item: Item) => {
    console.log(item);
  };

  return (
    <div ref={containerRef} className='flex absolute left-0 right-0 top-0 bottom-0'>
      <div className='flex flex-1 overflow-auto bg-gray-500'>
        <Grid items={items} layout={layout} onSelect={handleSelect} />
      </div>
    </div>
  );
};

export const Default = {
  render: () => <Test />
};
