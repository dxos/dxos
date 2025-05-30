//
// Copyright 2022 DXOS.org
//

import { line } from 'd3';

import { type GraphLayoutNode } from './types';
import { getCircumferencePoints } from './util';
import { type D3Callable } from '../typings';
import { type Point } from '../util';

const createLine = line();

export type LinkOptions = {
  source?: GraphLayoutNode<any>;
  target?: GraphLayoutNode<any>;
  point?: Point;
};

/**
 * Render linker while dragging.
 */
export const linkerRenderer: D3Callable = (root, { source, target, point }: LinkOptions = {}) => {
  root
    .selectAll('g.dx-linker')
    .data([{ id: 'linker' }])
    .join('g')
    .attr('class', 'dx-linker')
    .selectAll<SVGPathElement, any>('path')
    .data(source ? [{ id: 'edge' }] : [])
    .join('path')
    .attr('marker-end', () => (target ? 'url(#marker-arrow-end)' : 'url(#marker-dot)'))
    .attr('d', () => {
      return createLine(
        getCircumferencePoints(
          [source.x, source.y],
          target ? [target.x, target.y] : point,
          source.r,
          target ? target.r : 1,
        ),
      );
    });
};
