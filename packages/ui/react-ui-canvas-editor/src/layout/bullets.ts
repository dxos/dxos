//
// Copyright 2024 DXOS.org
//

import { type Selection, easeLinear, interpolate, select } from 'd3';

import type { BaseEdge, GraphEdge } from '@dxos/graph';
import { isTruthy } from '@dxos/util';

import { DATA_SHAPE_ID, getShapeElements } from '../components';
import type { CanvasGraphModel } from '../types';

/**
 * Retrieve paths and edges.
 * @param graph
 * @param root Root container for path elements.
 * @param filter
 */
export const getPaths = (
  graph: CanvasGraphModel,
  root: HTMLElement,
  filter: { source?: string; target?: string },
): { edge: BaseEdge; el: SVGPathElement }[] => {
  return getShapeElements<SVGPathElement>(root, 'path')
    .map((el) => {
      const edge = graph.getEdge(el.getAttribute(DATA_SHAPE_ID)!);
      return edge && edge.source === filter.source ? { edge, el } : null;
    })
    .filter(isTruthy);
};

export type BulletOptions = {
  max: number;
  radius: number;
  delay: number;
  minDuration: number;
  maxDuration: number;
};

export const defaultBulletOptions: BulletOptions = {
  max: 32,
  radius: 3,
  delay: 50,
  minDuration: 500,
  maxDuration: 1000,
};

/**
 * Fire bullet on node (recursive).
 * @param root Root container for path elements.
 * @param g Container for bullets.
 * @param graph
 * @param edge
 * @param propagate
 */
// TODO(burdon): Return cancel function.
export const fireBullet = (
  root: HTMLElement,
  g: SVGGElement,
  graph: CanvasGraphModel,
  edge: Partial<GraphEdge>,
  propagate = false,
) => {
  const cb = (edge: BaseEdge) => {
    const num = select(g).selectAll('circle').size();
    if (num < defaultBulletOptions.max) {
      const paths = getPaths(graph, root, { source: edge.target });
      for (const { edge, el } of paths) {
        select(g).call(createBullet(edge, el, defaultBulletOptions, cb));
      }
    }
  };

  const paths = getPaths(graph, root, edge);
  for (const { edge, el } of paths) {
    select(g).call(createBullet(edge, el, defaultBulletOptions, propagate ? cb : undefined));
  }
};

/**
 * Creates a bullet animation.
 */
export const createBullet = (
  edge: BaseEdge,
  path: SVGPathElement,
  options: BulletOptions = defaultBulletOptions,
  cb?: (edge: BaseEdge) => void,
) => {
  return (selection: Selection<any, any, any, any>) => {
    selection.each(function () {
      const p = path.getPointAtLength(0);
      const bullet = select(this)
        .append('circle')
        .attr('class', 'fill-orange-500')
        .attr('cx', p.x)
        .attr('cy', p.y)
        .attr('r', options.radius);

      // Pulse.
      bullet
        .transition('x')
        .duration(250)
        .attr('r', options.radius * 1.5)
        .transition()
        .duration(250)
        .attr('r', options.radius);

      bullet
        // Start animation.
        .transition()
        .delay(options.delay)
        .duration(options.minDuration)
        // .duration(options.minDuration + Math.random() * options.maxDuration)
        .ease(easeLinear)
        .tween('pathTween', function () {
          const length = path.getTotalLength();
          const r = interpolate(0, length);
          return (t) => {
            const point = path.getPointAtLength(r(t));
            select(this).attr('cx', point.x).attr('cy', point.y);
          };
        })
        // End animation.
        .on('end', function () {
          select(this).remove();
          cb?.(edge);
        });
    });
  };
};
