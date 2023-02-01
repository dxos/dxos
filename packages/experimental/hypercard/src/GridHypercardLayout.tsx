//
// Copyright 2023 DXOS.org
//

import { HypercardLayout } from './Hypercard';
import { Bounds, Item, Point } from './defs';

export type GridHypercardLayoutOption = {
  range: number;
  size: number;
  padding: number;
};

// TODO(burdon): Figure out coordinates: logical [x, y] to projected (based on center translation).
export class GridHypercardLayout implements HypercardLayout {
  private readonly _items = new Map<string, Item>();
  private readonly _bounds = new Map<string, Bounds | undefined>();

  private _center: Point = { x: 0, y: 0 };

  // prettier-ignore
  constructor(
    private readonly _options: GridHypercardLayoutOption = { range: 3, size: 300, padding: 20 }
  ) {}

  updateItems(items: Item[]) {
    this._items.clear();
    items.forEach((item) => {
      this._items.set(item.id, item);
    });
  }

  updateBounds(bounds: Bounds): void {
    this._center = { x: bounds.width / 2, y: bounds.height / 2 };
    this._bounds.clear();
    for (const [id, item] of this._items) {
      this._bounds.set(id, this.mapBounds(item.point));
    }
  }

  mapBounds(point: Point): Bounds {
    const grid = this._options.size + this._options.padding;
    return {
      point,
      x: this._center.x - grid / 2 + point.x * grid,
      y: this._center.y - grid / 2 + point.y * grid,
      // NOTE: If no padding then +1 to make borders overlap.
      width: this._options.size,
      height: this._options.size
    };
  }

  getBounds(id: string) {
    return this._bounds.get(id);
  }
}
