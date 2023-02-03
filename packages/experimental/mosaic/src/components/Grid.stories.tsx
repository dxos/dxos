//
// Copyright 2023 DXOS.org
//

import faker from 'faker';
import React, { useMemo, useState } from 'react';
import { useResizeDetector } from 'react-resize-detector';

import { range } from '@dxos/util';

import '@dxosTheme';

import { GridLayout } from '../grid-layout';
import { Item, Location } from '../layout';
import { Grid } from './Grid';

export default {
  component: Grid,
  argTypes: {}
};

faker.seed(100);

// TODO(burdon): Layout for columns (as sorted list) vs positional grid.

// TODO(burdon): Test drag-and-drop (with react and d3 libs).
// TODO(burdon): Hierarchical data model (zoom into children then redraw/reset zoom).
// TODO(burdon): Test containers with nested transform/scaled.

// TODO(burdon): Cartesian coordinates for layout (and storage).
// TODO(burdon): SVG engine for HTML and SVG (overlay); test transition.
// TODO(burdon): SVG connection points.
// TODO(burdon): Draw grid.

// TODO(burdon): Grid class.
// TODO(burdon): Simple card stack on mobile.
// TODO(burdon): Move to separate repo.

const num = 8;

const createItem = (location: Location): Item => ({
  id: faker.datatype.uuid(),
  label: faker.lorem.words(3),
  content: faker.lorem.sentences(faker.datatype.number(3)),
  location
});

const Test = () => {
  const { ref: containerRef } = useResizeDetector();
  const layout = useMemo(() => new GridLayout({ range: { x: 3, y: 2 } }), []);
  const [items, setItems] = useState<Item[]>(() => {
    return range(num).map(() => {
      return createItem({
        x: faker.datatype.number({ min: -layout.range.x, max: layout.range.x }),
        y: faker.datatype.number({ min: -layout.range.y, max: layout.range.y })
      });
    });
  });

  const handleSelect = (item: Item) => {
    console.log(item);
  };

  const handleCreate = async (location: Location) => {
    const item = createItem(location);
    setItems((items) => [...items, item]);
    return item.id;
  };

  const handleDelete = (item: Item) => {
    setItems((items) => items.filter(({ id }) => id !== item.id));
  };

  return (
    <div ref={containerRef} className='flex absolute left-0 right-0 top-0 bottom-0'>
      <Grid
        items={items}
        layout={layout}
        onSelect={handleSelect}
        onCreate={handleCreate}
        onDelete={handleDelete}
        slots={{
          tile: {
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
