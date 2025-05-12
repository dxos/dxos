//
// Copyright 2022 DXOS.org
//

import { line, select } from 'd3';

import { type Point } from '@dxos/gem-core';

import { type GraphLayoutNode } from './types';
import { getCircumferencePoints } from './util';

const createLine = line();

/**
 * Render linker while dragging.
 * @param root
 * @param source
 * @param target
 * @param point
 */
// TODO(burdon): Create generic class.
export const linkerRenderer = (
  root: SVGGElement,
  source?: GraphLayoutNode<any>,
  target?: GraphLayoutNode<any>,
  point?: Point,
) => {
  select(root)
    .selectAll('g.linker')
    .data([{ id: 'linker' }])
    .join('g')
    .attr('class', 'linker')
    .selectAll<SVGPathElement, any>('path')
    .data(source ? [{ id: 'link' }] : [])
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
