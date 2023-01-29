//
// Copyright 2023 DXOS.org
//

import faker from 'faker';
import React, { useEffect, useMemo } from 'react';
import { useResizeDetector } from 'react-resize-detector';

import { range } from '@dxos/util';

import '@dxosTheme';

import { Bounds, Grid, Item, Layout, Point } from './Grid';

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

// TODO(burdon): Check doesn't overlap.
// TODO(burdon): Figure out coordinates: logical [x, y] to projected (based on center translation).
class TestLayout implements Layout {
  private readonly _logical = new Map<string, Point | undefined>();
  private readonly _items = new Map<string, Bounds | undefined>();

  private _center?: Point;

  // TODO(burdon): Garbage collection.
  updateItems(items: Item[]) {
    const range = 3;
    items.forEach((item) => {
      this._logical.set(item.id, {
        x: faker.datatype.number({ min: -range, max: range }),
        y: faker.datatype.number({ min: -range, max: range })
      });
    });
  }

  updateBounds(bounds: Bounds, grid: number, size: number): void {
    this._center = { x: bounds.width / 2, y: bounds.height / 2 };
    this._items.clear();
    for (const [id, point] of this._logical) {
      if (point) {
        this._items.set(id, {
          x: this._center.x - grid / 2 + point.x * grid,
          y: this._center.y - grid / 2 + point.y * grid,
          width: size + 1,
          height: size + 1
        });
      }
    }
  }

  getBounds(id: string) {
    return this._items.get(id);
  }
}

const Test = () => {
  const { ref: containerRef, width, height } = useResizeDetector();
  const layout = useMemo(() => new TestLayout(), []);

  const num = 20;
  const items: Item[] = useMemo(
    () =>
      range(num).map((i) => ({
        id: String(i),
        label: faker.lorem.words(3),
        content: faker.lorem.sentences(faker.datatype.number(3))
      })),
    [num]
  );

  useEffect(() => {
    layout.updateItems(items);
  }, [items]);

  const size = 200;
  const padding = 20;
  useEffect(() => {
    const bounds = containerRef.current.getBoundingClientRect();
    layout.updateBounds(bounds, size + padding, size);
  }, [width, height, size, padding]);

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
