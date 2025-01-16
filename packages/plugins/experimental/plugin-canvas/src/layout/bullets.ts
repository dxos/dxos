//
// Copyright 2024 DXOS.org
//

import * as d3 from 'd3';
import { type Selection } from 'd3';

import type { BaseGraphEdge, GraphEdge } from '@dxos/graph';
import { isNotFalsy } from '@dxos/util';

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
): { edge: BaseGraphEdge; el: SVGPathElement }[] => {
  return getShapeElements<SVGPathElement>(root, 'path')
    .map((el) => {
      const edge = graph.getEdge(el.getAttribute(DATA_SHAPE_ID)!);
      return edge && edge.source === filter.source ? { edge, el } : null;
    })
    .filter(isNotFalsy);
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
  const cb = (edge: BaseGraphEdge) => {
    const num = d3.select(g).selectAll('circle').size();
    if (num < defaultBulletOptions.max) {
      const paths = getPaths(graph, root, { source: edge.target });
      for (const { edge, el } of paths) {
        d3.select(g).call(createBullet(edge, el, defaultBulletOptions, cb));
      }
    }
  };

  const paths = getPaths(graph, root, edge);
  for (const { edge, el } of paths) {
    d3.select(g).call(createBullet(edge, el, defaultBulletOptions), propagate ? cb : undefined);
  }
};

/**
 * Creates a bullet animation.
 */
export const createBullet = (
  edge: BaseGraphEdge,
  path: SVGPathElement,
  options: BulletOptions = defaultBulletOptions,
  cb?: (edge: BaseGraphEdge) => void,
) => {
  return (selection: Selection<any, any, any, any>) => {
    selection.each(function () {
      const p = path.getPointAtLength(0);
      const bullet = d3
        .select(this)
        .append('circle')
        .attr('class', 'fill-orange-500')
        .attr('cx', p.x)
        .attr('cy', p.y)
        .attr('r', options.radius);

      // Pulse.
      bullet
        .transition('s')
        .duration(500)
        .attr('r', options.radius * 1.5)
        .transition()
        .duration(300)
        .attr('r', options.radius);

      bullet
        // Start animation.
        .transition()
        .delay(options.delay)
        .duration(options.minDuration)
        // .duration(options.minDuration + Math.random() * options.maxDuration)
        .ease(d3.easeLinear)
        .tween('pathTween', function () {
          const length = path.getTotalLength();
          const r = d3.interpolate(0, length);
          return (t) => {
            const point = path.getPointAtLength(r(t));
            d3.select(this).attr('cx', point.x).attr('cy', point.y);
          };
        })
        // End animation.
        .on('end', function () {
          d3.select(this).remove();
          cb?.(edge);
        });
    });
  };
};
