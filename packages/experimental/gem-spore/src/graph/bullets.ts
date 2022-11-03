//
// Copyright 2019 DXOS.org
//

import * as d3 from 'd3';

import { D3Callable, D3Selection } from '@dxos/gem-core';

interface BulletOptions {
  max?: number;
  radius?: number;
  delay?: number;
  minDuration?: number;
  maxDuration?: number;
}

/**
 * Generate animated bullets that follow selected paths.
 * @param group
 * @param nodeId
 * @param options
 */
export const createBullets = (group: SVGGElement, nodeId: string, options: BulletOptions = {}): D3Callable => {
  return (selection: D3Selection) => {
    const { max = 32, radius = 3, delay = 50, minDuration = 100, maxDuration = 500 } = options;

    // Link selection.
    selection.each(function (d, i, links) {
      const { source, target } = d;

      // Match source node.
      if (source.id === nodeId) {
        const path = d3.select(links[i]);
        const p = path.node().getPointAtLength(0);

        const bullet = d3
          .select(group)
          .append('circle')
          .attr('class', 'bullet')
          .attr('cx', p.x)
          .attr('cy', p.y)
          .attr('r', radius);

        bullet
          // Start animation.
          .transition()
          .delay(delay)
          .duration(minDuration + Math.random() * maxDuration)
          .ease(d3.easeLinear)
          .tween('pathTween', function () {
            const length = path.node().getTotalLength();
            const r = d3.interpolate(0, length);

            return (t) => {
              const point = path.node().getPointAtLength(r(t));
              d3.select(this).attr('cx', point.x).attr('cy', point.y);
            };
          })

          // End of transition.
          .on('end', function () {
            d3.select(this).remove();

            // Propagate with circuit breaker to prevent infinite recursion.
            const num = d3.select(group).selectAll('circle.bullet').size();
            if (num < max) {
              selection.call(createBullets(group, target.id));
            }
          });
      }
    });
  };
};
