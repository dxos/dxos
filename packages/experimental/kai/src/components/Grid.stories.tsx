//
// Copyright 2023 DXOS.org
//

import faker from 'faker';
import React, { useMemo } from 'react';
import { useResizeDetector } from 'react-resize-detector';

import { range } from '@dxos/util';

import '@dxosTheme';

import { TestGridLayout, Grid, Item } from './Grid';

export default {
  component: Grid,
  argTypes: {}
};

faker.seed(100);

//     un-think-able
//   free-think-ing
// double-think
//  group-think
//    out-think-ing
//     re-think
//   over-think
//        think-er
//     me-think-s
//        think-about-it
//        think

// TODO(burdon): Test drag-and-drop (with react and d3 libs).
// TODO(burdon): Text editor inside each cell (only editable when focused).
// TODO(burdon): Create node in empty cell and placeholder on drag.
// TODO(burdon): Infinite scroll (overdraw bounds)

// TODO(burdon): Hierarchical data model (zoom into children then redraw/reset zoom).
// TODO(burdon): Test containers with nested transform/scaled.
// TODO(burdon): Layout class.

// TODO(burdon): Cartesian coordinates for layout (and storage).
// TODO(burdon): SVG engine for HTML and SVG (overlay); test transition.
// TODO(burdon): SVG connection points.
// TODO(burdon): Draw grid.

// TODO(burdon): Grid class.
// TODO(burdon): Simple card stack on mobile.
// TODO(burdon): Move to separate repo.

const Test = () => {
  const { ref: containerRef } = useResizeDetector();
  const layout = useMemo(() => new TestGridLayout(), []);

  const num = 10;
  const items: Item[] = useMemo(() => {
    const dim = 3;

    return range(num).map((i) => {
      const point = {
        x: faker.datatype.number({ min: -dim, max: dim }),
        y: faker.datatype.number({ min: -dim, max: dim })
      };

      return {
        id: String(i),
        point,
        label: faker.lorem.words(3),
        content: faker.lorem.sentences(faker.datatype.number(3))
      };
    });
  }, [num]);

  const handleSelect = (item: Item) => {
    console.log(item);
  };

  // TODO(burdon): Overdraw bounds so can click outside.
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
