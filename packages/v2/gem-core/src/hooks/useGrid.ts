//
// Copyright 2020 DXOS.org
//

import * as d3 from 'd3';
import { RefObject, useEffect, useRef } from 'react';

import { SvgContext } from '../context';

const createLine = d3.line();

export type GridOptions = {
  axis?: boolean
}

const defaultOptions: GridOptions = {
  axis: true
};

/**
 * Create grid based on size and current zoom transform.
 */
const createGrid = (context: SvgContext, options: GridOptions) => {
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

export const grid = (context: SvgContext, options: GridOptions) => (el) => {
  const paths = createGrid(context, options);

  el.selectAll('path')
    .data(paths, path => path.id)
    .join('path')
    .style('pointer-events', 'none')
    .attr('d', d => d.path)
    .attr('class', d => d.class);

  if (context.scale.transform) {
    el.attr('transform', context.scale.transform);
    el.attr('stroke-width', 1 / context.scale.transform.k);
  }
};

/**
 * Creates a reference to a SVG Group element which renders a grid.
 * @param context
 * @param options
 */
export const useGrid = (context: SvgContext, options: GridOptions = defaultOptions): RefObject<SVGGElement> => {
  const ref = useRef<SVGGElement>();
  useEffect(() => context.resize.on(() => {
    if (!context.size) {
      return;
    }

    d3.select(ref.current)
      .call(grid(context, options));
  }), []);

  return ref;
};
