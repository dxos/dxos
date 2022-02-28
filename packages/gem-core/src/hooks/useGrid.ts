//
// Copyright 2020 DXOS.org
//

import * as d3 from 'd3';
import { RefObject, useEffect, useMemo, useRef } from 'react';

import { SVGContext } from '../context';
import { useSvgContext } from './useSvgContext';

const createLine = d3.line();

type PathGroup = {
  id: string
  class: string
  path: string
}

/**
 * Create grid based on size and current zoom transform.
 */
const createGrid = (context: SVGContext, options: GridOptions): PathGroup[] => {
  const paths = [];
  const { width, height } = context.size;
  const { x, y, k } = context.scale.transform;
  const s = 1 / k;

  // Offset.
  const w = width * s;
  const h = height * s;
  const dx = -(x + width / 2) * s;
  const dy = -(y + height / 2) * s;

  // TODO(burdon): Use the transform to create the range?
  //   https://github.com/d3/d3-zoom#transform_rescaleX

  // Axis.
  if (options.axis) {
    const axis = [
      [[0, dy], [0, dy + h]],
      [[dx, 0], [dx + w, 0]]
    ];

    paths.push({
      id: 'axis',
      class: 'axis',
      path: axis.map(line => createLine(line as any)).join()
    });
  }

  // Scale grid size.
  const mod = (n, size, delta = 0) => (Math.floor(n / size + delta) * size);

  // Major grid lines.
  const majorSize = context.scale.gridSize;
  const xMajor = d3.range(-mod((x + width / 2) * s, majorSize), mod((-x + width / 2) * s, majorSize, 1), majorSize);
  const yMajor = d3.range(-mod((y + height / 2) * s, majorSize), mod((-y + height / 2) * s, majorSize, 1), majorSize);
  const major = [
    ...xMajor.filter(x => !options.axis || x).map(x => [[x, dy], [x, dy + h]]),
    ...yMajor.filter(y => !options.axis || y).map(y => [[dx, y], [dx + w, y]])
  ];

  paths.push({
    id: 'major',
    class: 'major',
    path: major.map(line => createLine(line as any)).join()
  });

  // Minor grid lines.
  // Find nearest power of 2 to gridSize.
  // TODO(burdon): Doesn't work is scale is not power of 2.
  const minorSize = Math.pow(2, Math.round(Math.log2(s * context.scale.gridSize)));
  if (majorSize > minorSize) {
    const xMinor = d3.range(-mod((x + width / 2) * s, minorSize), mod((-x + width / 2) * s, minorSize, 1), minorSize);
    const yMinor = d3.range(-mod((y + height / 2) * s, minorSize), mod((-y + height / 2) * s, minorSize, 1), minorSize);
    const minor = [
      ...xMinor.filter(x => xMajor.indexOf(x) === -1).map(x => [[x, dy], [x, dy + h]]),
      ...yMinor.filter(y => yMajor.indexOf(y) === -1).map(y => [[dx, y], [dx + w, y]])
    ];

    paths.push({
      id: 'minor',
      class: 'minor',
      path: minor.map(line => createLine(line as any)).join()
    });
  }

  return paths;
};

export type GridOptions = {
  visible?: boolean
  axis?: boolean
}

const defaultOptions: GridOptions = {
  visible: true,
  axis: true
};

/**
 * Grid handler.
 */
export class GridController {
  _visible: boolean = false;

  constructor (
    private readonly _ref: RefObject<SVGGElement>,
    private readonly _context: SVGContext,
    private readonly _options: GridOptions
  ) {
    this._visible = this._options.visible ?? true;
  }

  get ref () {
    return this._ref;
  }

  get visible () {
    return this._visible;
  }

  draw () {
    if (!this._context.size) {
      return;
    }

    const paths = this._visible ? createGrid(this._context, this._options) : [];
    const root = d3.select(this._ref.current);

    root.selectAll<SVGPathElement, PathGroup>('path')
      .data(paths, path => path.id)
      .join('path')
      .style('pointer-events', 'none')
      .attr('d', d => d.path)
      .attr('class', d => d.class);

    const transform = this._context.scale.transform;
    if (transform) {
      root.attr('transform', transform as any);
      root.attr('stroke-width', 1 / transform.k);
    }
  }

  setVisible (visible: boolean) {
    this._visible = visible;
    this.draw();
    return this;
  }
}

/**
 * Creates a reference to a SVG Group element which renders a grid.
 * @param options
 */
export const useGrid = (options: GridOptions = defaultOptions): GridController => {
  const ref = useRef<SVGGElement>();
  const context = useSvgContext();
  const grid = useMemo(() => new GridController(ref, context, options), []);
  useEffect(() => context.resized.on(() => {
    grid.draw();
  }), []);

  return grid;
};
