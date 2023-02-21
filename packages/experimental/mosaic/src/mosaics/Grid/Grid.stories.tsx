//
// Copyright 2023 DXOS.org
//

import faker from 'faker';
import React, { useMemo, useState } from 'react';

import { range } from '@dxos/util';

import '@dxosTheme';

import { Vec2 } from '../../props';
import { createItem } from '../../testing';
import { Grid, GridTile } from './Grid';
import { GridLayout } from './grid-layout';

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

const Test = () => {
  const layout = useMemo(() => new GridLayout({ range: { x: 3, y: 2 } }), []);
  const [tiles, setTiles] = useState<GridTile[]>(() => {
    return range(num).map(() => {
      return createItem({
        x: faker.datatype.number({ min: -layout.range.x, max: layout.range.x }),
        y: faker.datatype.number({ min: -layout.range.y, max: layout.range.y })
      });
    });
  });

  const handleSelect = (item: GridTile) => {
    console.log(item);
  };

  const handleCreate = async (position: Vec2) => {
    const item = createItem(position);
    setTiles((tiles) => [...tiles, item]);
    return item.id;
  };

  const handleDelete = (item: GridTile) => {
    setTiles((tiles) => tiles.filter(({ id }) => id !== item.id));
  };

  return <Grid tiles={tiles} layout={layout} onSelect={handleSelect} onCreate={handleCreate} onDelete={handleDelete} />;
};

export default {
  component: Grid,
  decorators: [
    (Story: any) => (
      <div className='flex flex-col h-screen w-full'>
        <Story />
      </div>
    )
  ],
  parameters: {
    layout: 'fullscreen'
  }
};

export const Default = {
  render: () => <Test />
};
