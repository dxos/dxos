//
// Copyright 2023 DXOS.org
//

import React from 'react';
import { useResizeDetector } from 'react-resize-detector';

import { range } from '@dxos/util';
import '@dxosTheme';

import { Bounds, Grid, Item } from './Grid';

export default {
  component: Grid,
  argTypes: {}
};

const random = (n: number) => Math.random() * n;

// TODO(burdon): Grid class.
// TODO(burdon): Border (inset). Set position.
const snapper = (n: number, s: number) => Math.floor(n / s) * s;

const items: Item[] = range(50).map((i) => ({ id: String(i), label: `${i}` }));

// TODO(burdon): Test drag-and-drop.
// TODO(burdon): Test animate move.
// TODO(burdon): Hierarchical data model.
// TODO(burdon): Test containers with nested transform/scaled.
// TODO(burdon): SVG connection points.
// TODO(burdon): Layout with precise positioning (fractions). Snap grid.
// TODO(burdon): Draw grid.

const Test = () => {
  const { ref: containerRef, width, height } = useResizeDetector();

  const size = 120;
  const snap = (n: number) => snapper(n, size);

  // TODO(burdon): Layout class.
  // TODO(burdon): Grid vs. size.
  const layout = (item: Item): Bounds => ({
    x: snap(random(width!)),
    y: snap(random(height!)),
    width: size + 1,
    height: size + 1
  });

  return (
    <div ref={containerRef} className='absolute flex left-0 right-0 top-0 bottom-0'>
      <Grid items={items} layout={layout} />
    </div>
  );
};

export const Default = {
  render: () => <Test />
};
