//
// Copyright 2023 DXOS.org
//

import defaultsdeep from 'lodash.defaultsdeep';

import { HypercardLayout } from './Hypercard';
import { Bounds, Dimensions, Point } from './defs';

export type GridHypercardLayoutOptions = {
  range: number;
  size: number;
  padding: number;
};

export class GridHypercardLayout implements HypercardLayout {
  private _center: Point = { x: 0, y: 0 };
  private readonly _placeholders: Point[] = [];
  private readonly _options: GridHypercardLayoutOptions;
  private readonly _dimensions: Dimensions;

  // prettier-ignore
  constructor(
    options: Partial<GridHypercardLayoutOptions> = {}
  ) {
    this._options = defaultsdeep(options, { range: 1, size: 300, padding: 16 });

    const s = (1 + this._options.range * 2);
    this._dimensions = {
      width: s * this._options.size + (s + 1) * this._options.padding,
      height: s * this._options.size + (s + 1) * this._options.padding
    };

    this._center = { x: this._dimensions.width / 2, y: this._dimensions.height / 2 };

    const range = this._options.range;
    for (let x = -range; x <= range; x++) {
      for (let y = -range; y <= range; y++) {
        this._placeholders.push({ x, y });
      }
    }
  }

  get range() {
    return this._options.range;
  }

  get dimensions() {
    return this._dimensions;
  }

  get placeholders() {
    return this._placeholders;
  }

  getBounds(point: Point): Bounds {
    const grid = this._options.size + this._options.padding;
    return {
      x: this._center.x + point.x * grid - this._options.size / 2,
      y: this._center.y + point.y * grid - this._options.size / 2,
      width: this._options.size,
      height: this._options.size
    };
  }
}
