//
// Copyright 2023 DXOS.org
//

import { faker } from '@faker-js/faker';
import React, { useMemo, useState } from 'react';

import { range } from '@dxos/util';

import '@dxosTheme';

import { Grid } from './Grid';
import { GridLayout, Item, Location } from '../../layout';
import { createItem, SeedDecorator, TestData, TestTileContent } from '../../testing';

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

const Test = () => {
  const layout = useMemo(() => new GridLayout({ range: { x: 3, y: 2 } }), []);
  const [items, setItems] = useState<Item<TestData>[]>(() => {
    return range(num).map(() => {
      return createItem({
        x: faker.number.int({ min: -layout.range.x, max: layout.range.x }),
        y: faker.number.int({ min: -layout.range.y, max: layout.range.y }),
      });
    });
  });

  const handleSelect = (item: Item<TestData>) => {
    // console.log(item);
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
    <Grid<TestData>
      items={items}
      layout={layout}
      Content={TestTileContent}
      onSelect={handleSelect}
      onCreate={handleCreate}
      onDelete={handleDelete}
      slots={{
        tile: {
          root: {
            className: 'bg-green-50 select-none cursor-pointer text-black shadow',
          },
          selected: {
            className: 'shadow-lg ring-1 ring-orange-200',
          },
        },
        cell: {
          showLocation: true,
          over: {
            className: 'bg-zinc-200',
          },
        },
      }}
    />
  );
};

export default {
  component: Grid,
  decorators: [
    SeedDecorator(999),
    (Story: any) => (
      <div className='flex flex-col h-screen w-full'>
        <Story />
      </div>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default = {
  render: () => <Test />,
};
