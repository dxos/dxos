//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import * as d3 from 'd3';
import { ScaleLinear } from 'd3-scale';
import { useEffect, useState } from 'react';

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number | null;
  height: number | null;
}

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GridProperties {
  empty: () => boolean;
  size: Size;
  center: Point;
  snap: (point:Point) => Point;
  bounds: (p1: Point, p2: Point) => Bounds;
  invert: (point: Point) => Point;
  round: (point: Point) => Point;
  project: (point: Point) => Point;
  scaleX: any;
  scaleY: any;
  ticks: any;
  zoom: any;
  unit: any;
}

/**
 * @param width
 * @param height
 * @returns {boolean}
 */
export const isNull = ({ width, height }: Size) => (width === null || height === null);

/**
 * @param width
 * @param height
 * @returns {{x: number, y: number}}
 */
export const getCenter = ({ width, height }: Size) => ({ x: (width || 0) / 2, y: (height || 0) / 2 });

/**
 * @returns {{ size, center, scaleX, scaleY, ticks, zoom }}
 */
export const createGrid = ({ width = 0, height = 0 }: Size, zoom = 1): GridProperties => {
  assert(zoom);

  // https://observablehq.com/@d3/d3-scalelinear
  // https://github.com/d3/d3-scale#scaleLinear
  // https://github.com/d3/d3-scale#quantize_invertExtent

  // NOTE: Nominal user space bounds.
  // TODO(burdon): Keep extent the same and increase size (with scrollbars).
  const extent = 100 / zoom;

  // Ensure sqaure grid.
  const max = Math.max(width || 0, height || 0);

  // Depends on screen size.
  // TODO(burdon): Powers of two.
  const ticks = Math.floor(max / 32);

  const scaleX = d3.scaleLinear()
    .domain([-extent, extent])
    .range([-max / 2, max / 2]);

  // NOTE: Reversed scale (since SVG uses top-left coordinates).
  const scaleY = d3.scaleLinear()
    .domain([extent, -extent])
    .range([-max / 2, max / 2]);

  // Calculate the size between ticks.
  // TODO(burdon): Better way to get this?
  const interval = (scale: ScaleLinear<any, any, any>, ticks: number) => {
    const values = scale.ticks(ticks);
    return Math.abs(values[0] - values[1]);
  };

  const unit = interval(scaleX, ticks);

  const round = (value: number, unit: number) => Math.round(value / unit) * unit;

  const snapper = (value: number, scale: ScaleLinear<any, any, any>) => scale(round(scale.invert(value), unit));

  return {
    //
    // Screen space.
    //

    empty: () => !(width && height),
    size: { width, height },
    center: { x: 0, y: 0 },
    snap: ({ x, y }) => ({ x: snapper(x, scaleX), y: snapper(y, scaleY) }),
    bounds: ({ x: x1, y: y1 }, { x: x2, y: y2 }) => ({
      x: Math.min(x1, x2),
      y: Math.min(y1, y2),
      width: Math.abs(x1 - x2),
      height: Math.abs(y1 - y2)
    }),

    // TODO(burdon): Use fractions, or round to grid unit.
    invert: ({ x, y }) => ({
      x: Math.round(scaleX.invert(x)),
      y: Math.round(scaleY.invert(y))
    }),

    //
    // Model space.
    //

    round: ({ x, y }) => ({ x: round(x, unit), y: round(y, unit) }),
    project: ({ x, y }) => ({ x: scaleX(x), y: scaleY(y) }),

    //
    // Grid.
    //

    scaleX,
    scaleY,
    ticks,
    zoom,
    unit
  };
};

export const useGrid = ({ width, height }: Size, zoom = 1) => {
  const [grid, setGrid] = useState(() => createGrid({ width, height }, zoom));

  useEffect(() => {
    setGrid(createGrid({ width, height }, zoom));
  }, [width, height, zoom]);

  return grid;
};
