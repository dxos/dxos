//
// Copyright 2023 DXOS.org
//

import faker from 'faker';
import React, { useMemo, useState } from 'react';
import { useResizeDetector } from 'react-resize-detector';

import { range } from '@dxos/util';

import '@dxosTheme';

import { GridHypercardLayout } from './GridHypercardLayout';
import { Hypercard } from './Hypercard';
import { Item, Point } from './defs';

export default {
  component: Hypercard,
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

const num = 8;

const createItem = (point: Point) => ({
  id: faker.datatype.uuid(),
  point,
  label: faker.lorem.words(3),
  content: faker.lorem.sentences(faker.datatype.number(3))
});

const Test = () => {
  const { ref: containerRef } = useResizeDetector();
  const layout = useMemo(() => new GridHypercardLayout({ range: 3 }), []);
  const [items, setItems] = useState<Item[]>(() => {
    const dim = layout.range;
    return range(num).map((i) => {
      const point = {
        x: faker.datatype.number({ min: -dim, max: dim }),
        y: faker.datatype.number({ min: -dim, max: dim })
      };

      return createItem(point);
    });
  });

  const handleSelect = (item: Item) => {
    console.log(item);
  };

  const handleCreate = async (point: Point) => {
    const item = createItem(point);
    setItems((items) => [...items, item]);
    return item;
  };

  const handleDelete = (item: Item) => {
    console.log(item);
    setItems((items) => items.filter(({ id }) => id !== item.id));
  };

  // TODO(burdon): Overdraw bounds so can click outside.
  // TODO(burdon): Provide content renderer for cells.
  return (
    <div ref={containerRef} className='flex absolute left-0 right-0 top-0 bottom-0'>
      <Hypercard
        items={items}
        layout={layout}
        onSelect={handleSelect}
        onCreate={handleCreate}
        onDelete={handleDelete}
        slots={{
          cell: {
            root: 'bg-yellow-100 select-none cursor-pointer text-black shadow',
            selected: 'shadow-lg ring-1 ring-orange-400'
          }
        }}
      />
    </div>
  );
};

export const Default = {
  render: () => <Test />
};
