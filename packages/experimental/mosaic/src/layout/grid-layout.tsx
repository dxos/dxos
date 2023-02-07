//
// Copyright 2023 DXOS.org
//

import defaultsdeep from 'lodash.defaultsdeep';

import { Bounds, Dimensions, Layout, Location, Point } from './layout';

export type GridLayoutOptions = {
  range: { x: number; y: number };
  dimensions: Dimensions;
  padding: number;
};

export class GridLayout implements Layout {
  private _center: Point = { x: 0, y: 0 };
  private readonly _cells: Location[] = [];
  private readonly _options: GridLayoutOptions;
  private readonly _dimensions: Dimensions;

  // prettier-ignore
  constructor(
    options: Partial<GridLayoutOptions> = {}
  ) {
    this._options = defaultsdeep(options, {
      range: { x: 1, y: 1 },
      dimensions: { width: 300, height: 200 },
      padding: 16
    });

    const sx = (1 + this._options.range.x * 2);
    const sy = (1 + this._options.range.y * 2);
    this._dimensions = {
      width: sx * this._options.dimensions.width + (sx + 1) * this._options.padding,
      height: sy * this._options.dimensions.height + (sy + 1) * this._options.padding
    };

    this._center = { x: this._dimensions.width / 2, y: this._dimensions.height / 2 };

    const range = this._options.range;
    for (let x = -range.x; x <= range.x; x++) {
      for (let y = -range.y; y <= range.y; y++) {
        this._cells.push({ x, y });
      }
    }
  }

  get range() {
    return this._options.range;
  }

  get dimensions() {
    return this._dimensions;
  }

  get cells() {
    return this._cells;
  }

  getCenter(location: Location): Point {
    const bounds = this.getBounds(location);
    return {
      x: bounds.x + bounds.width / 2 - this.dimensions.width / 2,
      y: bounds.y + bounds.height / 2 - this.dimensions.height / 2
    };
  }

  getBounds(location: Location): Bounds {
    return {
      x:
        this._center.x +
        location.x * (this._options.dimensions.width + this._options.padding) -
        this._options.dimensions.width / 2,
      y:
        this._center.y +
        location.y * (this._options.dimensions.height + this._options.padding) -
        this._options.dimensions.height / 2,
      width: this._options.dimensions.width,
      height: this._options.dimensions.height
    };
  }
}
