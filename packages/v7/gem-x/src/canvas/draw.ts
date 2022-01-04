//
// Copyright 2021 DXOS.org
//

import * as d3 from 'd3';

import { Element, Circle, Line, Path, PathType, Rect, createElement } from '../model';
import { Point } from '../scale';

const getCurve = (type: PathType, closed: boolean) => {
  const curves = {
    open: {
      linear: d3.curveLinear,
      basis: d3.curveBasis,
      cardinal: d3.curveCardinal,
      step: d3.curveStep
    },
    closed: {
      linear: d3.curveLinearClosed,
      basis: d3.curveBasisClosed,
      cardinal: d3.curveCardinalClosed,
      step: d3.curveStep
    }
  };

  return curves[closed ? 'closed' : 'open'][type];
};

/**
 *
 * @param elements
 * @param point
 */
export const findElement = (elements: Element[], point: Point): (Element | undefined) => {
  return undefined;
};

/**
 *
 * @param root
 * @param element
 * @param scale
 */
export const createSvgElement = (root, element, scale) => {
  const { type } = element;
  switch (type) {
    case 'circle': {
      root.append('circle');
      updateSvgElement(root, element, scale);
      break;
    }

    case 'rect': {
      root.append('rect');
      updateSvgElement(root, element, scale);
      break;
    }

    case 'line': {
      root.append('line');
      updateSvgElement(root, element, scale);
      break;
    }

    case 'path': {
      root.append('path');
      updateSvgElement(root, element, scale);
      break;
    }
  }
};

/**
 *
 * @param root
 * @param element
 * @param scale
 */
export const updateSvgElement = (root, element, scale) => {
  const { type, data } = element;
  switch (type) {
    case 'circle': {
      const { x, y, r } = (data as Circle);
      root.select('circle')
        .attr('cx', scale.mapToScreen(x))
        .attr('cy', scale.mapToScreen(y))
        .attr('r', scale.mapToScreen(r));
      break;
    }

    case 'rect': {
      const { x, y, width, height } = (data as Rect);
      root.select('rect')
        .attr('x', scale.mapToScreen(x))
        .attr('y', scale.mapToScreen(y))
        .attr('width', scale.mapToScreen(width))
        .attr('height', scale.mapToScreen(height));
      break;
    }

    case 'line': {
      const { x1, y1, x2, y2 } = (data as Line);
      root.select('line')
        .attr('x1', scale.mapToScreen(x1))
        .attr('y1', scale.mapToScreen(y1))
        .attr('x2', scale.mapToScreen(x2))
        .attr('y2', scale.mapToScreen(y2));
      break;
    }

    case 'path': {
      // https://github.com/d3/d3-element/#lines
      const { type, closed, points } = (data as Path);
      const curve = getCurve(type, closed);
      const line = curve ? d3.line().curve(curve) : d3.line();
      root.select('path')
        .attr('d', line(points.map(([x, y]) => [scale.mapToScreen(x), scale.mapToScreen(y)])));
      break;
    }
  }
};

/**
 *
 * @param root
 * @param element
 * @param scale
 */
export const createSvgCursor = (root, element, scale) => {
  if (true) {
    return createSvgElement(root, element, scale);
  }

  const handles = [
    { id: 'n', p: [0, 1] },
    { id: 'ne', p: [1, 1] },
    { id: 'e', p: [1, 0] },
    { id: 'se', p: [1, -1] },
    { id: 's', p: [0, -1] },
    { id: 'sw', p: [-1, -1] },
    { id: 'w', p: [-1, 0] },
    { id: 'nw', p: [-1, 1] }
  ];

  const outline = createElement('_', 'rect', [-8, -2], [-3, 2]);
  const data = outline.data as Rect;

  // TODO(burdon): Convert model to pixel space.

  const x = scale.mapToScreen(data.x);
  const y = scale.mapToScreen(data.y);
  const width = scale.mapToScreen(data.width);
  const height = scale.mapToScreen(data.height);

  const cx = x + width / 2;
  const cy = y + height / 2;

  root
    .selectAll('rect')
    .data(['outline'])
    .join('rect')
    .attr('x', x)
    .attr('y', y)
    .attr('width', width)
    .attr('height', height);

  root
    .selectAll('circle')
    .data(handles)
    .join('circle')
    .attr('cx', ({ p }) => cx + p[0] * width / 2)
    .attr('cy', ({ p }) => cy + p[1] * height / 2)
    .attr('r', 5); // TODO(burdon): Grow as zoomed.
};

/**
 *
 * @param root
 * @param element
 * @param scale
 */
export const updateSvgCursor = (root, element, scale) => {
  return updateSvgElement(root, element, scale);
};
