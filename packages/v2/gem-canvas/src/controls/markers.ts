//
// Copyright 2022 DXOS.org
//

import { D3Callable } from '@dxos/gem-core';

// TODO(burdon): Reconcile with @gem-spore.

export type MarkerOptions = {
  arrowSize?: number
}

/**
 * https://developer.mozilla.org/en-US/docs/Web/SVG/Element/marker
 * https://www.dashingd3js.com/svg-paths-and-d3js
 * http://bl.ocks.org/dustinlarimer/5888271
 *
 * @param arrowSize
 * @param classes
 * @return {function(*): null|undefined}
 */
export const createMarkers = ({ arrowSize = 8 }: MarkerOptions = {}): D3Callable => group => {
  const n = arrowSize;
  const m = n * 2/3;
  const points = [[-n, -m], [0, 0], [-n, m]];

  // https://developer.mozilla.org/en-US/docs/Web/SVG/Element/marker
  return group
    .selectAll('marker')
      .data([
        {
          name: 'arrow',
          path: 'M' + points.map(p => p.join(',')).join(' L'),
          viewbox: `-${n} -${n} ${n * 2} ${n * 2}`,
          className: 'arrow'
        }
      ])
      .join('marker')
        .attr('id', d => 'marker_' + d.name)
        .attr('markerHeight', arrowSize * 2)
        .attr('markerWidth', arrowSize * 2)
        .attr('markerUnits', 'strokeWidth')
        .attr('orient', 'auto')
        .attr('refX', 0.5)
        .attr('refY', 0)
        .attr('viewBox', d => d.viewbox)
        // TODO(burdon): Generalize.
        .append('path')
          .attr('d', d => d.path)
          .attr('class', 'arrow' );
};
