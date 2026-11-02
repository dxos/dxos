//
// Copyright 2019 DXOS.org
//

import { easeLinear, interpolate, select } from 'd3';

import { type D3Callable, type D3Selection, getCircumferencePoints } from '../../util/index.ts';
import { type GraphLayoutEdge } from '../types.ts';

export type BulletOptions = {
  max?: number;
  radius?: number;
  delay?: number;
  minDuration?: number;
  maxDuration?: number;
};

/**
 * Generate animated bullets that follow selected paths.
 * @param group
 * @param nodeId
 * @param options
 */
export const createBullets = (group: SVGGElement, nodeId: string, options: BulletOptions = {}): D3Callable => {
  return (selection: D3Selection) => {
    const { max = 32, radius = 3, delay = 50, minDuration = 100, maxDuration = 500 } = options;

    // Edge selection.
    selection.each(function (d, i, edges) {
      const { source, target } = d;

      // Match source node.
      if (source.id === nodeId) {
        const shape = edges[i] as SVGGeometryElement;
        const pointAt = createPointAt(shape, d);
        const p = pointAt(0);

        const bullet = select(group)
          .append('circle')
          .attr('class', 'dx-bullet')
          .attr('cx', p.x)
          .attr('cy', p.y)
          .attr('r', radius);

        bullet
          // Start animation.
          .transition()
          .delay(delay)
          .duration(minDuration + Math.random() * maxDuration)
          .ease(easeLinear)
          .tween('pathTween', function () {
            return (t) => {
              const point = pointAt(t);
              select(this).attr('cx', point.x).attr('cy', point.y);
            };
          })

          // End of transition.
          .on('end', function () {
            select(this).remove();

            // Propagate with circuit breaker to prevent infinite recursion.
            const num = select(group).selectAll('circle.dx-bullet').size();
            if (num < max) {
              selection.call(createBullets(group, target.id));
            }
          });
      }
    });
  };
};

/**
 * Point at fraction `t` along the edge. A straight edge's polyline also traces its arrowheads,
 * so its segment is rebuilt from the edge's endpoints instead of measured from the shape.
 */
const createPointAt = (shape: SVGGeometryElement, edge: GraphLayoutEdge): ((t: number) => { x: number; y: number }) => {
  if (shape instanceof SVGPolylineElement) {
    const { source, target } = edge;
    const [[x1, y1], [x2, y2]] = getCircumferencePoints([source.x, source.y], [target.x, target.y], source.r, target.r);
    return (t) => ({ x: x1 + (x2 - x1) * t, y: y1 + (y2 - y1) * t });
  }

  const length = shape.getTotalLength();
  return (t) => shape.getPointAtLength(interpolate(0, length)(t));
};
