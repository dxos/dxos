//
// Copyright 2022 DXOS.org
//

import { css } from '@emotion/css';

import { D3Callable } from '@dxos/gem-core';

export const defaultMarkerStyles = css`
  marker {
    path.arrow {
      stroke: #111;
      stroke-width: 0.5;
      fill: none;
    }
  }
`;

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
// TODO(burdon): Generalize for other markers?
export const createMarkers = ({ arrowSize = 10 }: MarkerOptions = {}): D3Callable => group => {
  const length = arrowSize;
  const width = length * 0.6;
  const offset = 0.5; // Offset from end of line.

  // https://developer.mozilla.org/en-US/docs/Web/SVG/Element/marker
  return group
    .selectAll('marker')
      .data([
        {
          name: 'arrow-start',
          path: 'M' + [[length, width], [0, 0], [length, -width]].map(p => p.join(',')).join(' L'),
          viewbox: `-${length} -${length} ${length * 2} ${length * 2}`,
          className: 'arrow',
          offset: -offset
        },
        {
          name: 'arrow-end',
          path: 'M' + [[-length, -width], [0, 0], [-length, width]].map(p => p.join(',')).join(' L'),
          viewbox: `-${length} -${length} ${length * 2} ${length * 2}`,
          className: 'arrow',
          offset: offset
        }
      ])
      .join('marker')
        .attr('id', d => 'marker-' + d.name)
        .attr('markerHeight', arrowSize * 2)
        .attr('markerWidth', arrowSize * 2)
        .attr('markerUnits', 'strokeWidth')
        .attr('orient', 'auto')
        .attr('refX', d => d.offset)
        .attr('refY', 0)
        .attr('viewBox', d => d.viewbox)
        // TODO(burdon): Generalize.
        .append('path')
          .attr('d', d => d.path)
          .attr('class', 'arrow' );
};
