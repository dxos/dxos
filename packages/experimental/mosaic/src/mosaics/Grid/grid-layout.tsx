//
// Copyright 2023 DXOS.org
//

import defaultsdeep from 'lodash.defaultsdeep';

import { Vec2, Box2 } from '../../props';

// TODO(burdon): Make generic part of location.
export const serializePosition = ({ x, y }: Vec2) => `${x}:${y}`;
export const parsePosition = (id: string): Vec2 => {
  const parts = id.split(':');
  return { x: parseInt(parts[0]), y: parseInt(parts[1]) };
};

export interface Layout {
  range: Vec2;
  size: Vec2;
  cells: Vec2[];
  getCenter(location: Vec2): Vec2;
  getBox(location: Vec2): Box2;
}

export type GridLayoutOptions = {
  range: Vec2;
  size: Vec2;
  gap: number;
};

export class GridLayout implements Layout {
  private _center: Vec2 = { x: 0, y: 0 };
  private readonly _cells: Vec2[] = [];
  private readonly _options: GridLayoutOptions;
  private readonly _size: Vec2;

  // prettier-ignore
  constructor(
    options: Partial<GridLayoutOptions> = {}
  ) {
    this._options = defaultsdeep(options, {
      range: { x: 1, y: 1 },
      size: { x: 300, y: 200 },
      gap: 16
    });

    const sx = (1 + this._options.range.x * 2);
    const sy = (1 + this._options.range.y * 2);
    this._size = {
      x: sx * this._options.size.x + (sx + 1) * this._options.gap,
      y: sy * this._options.size.y + (sy + 1) * this._options.gap
    };

    this._center = { x: this._size.x / 2, y: this._size.y / 2 };

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

  get size() {
    return this._size;
  }

  get cells() {
    return this._cells;
  }

  getCenter(vec2: Vec2): Vec2 {
    const { position, size } = this.getBox(vec2);
    return {
      x: position.x + size.x / 2 - this.size.x / 2,
      y: position.y + size.y / 2 - this.size.y / 2
    };
  }

  getBox(vec2: Vec2): Box2 {
    return {
      position: {
        x: this._center.x + vec2.x * (this._options.size.x + this._options.gap) - this._options.size.x / 2,
        y: this._center.y + vec2.y * (this._options.size.y + this._options.gap) - this._options.size.y / 2
      },
      size: this._options.size
    };
  }
}
