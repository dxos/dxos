//
// Copyright 2022 DXOS.org
//

import * as d3 from 'd3';

import { D3Callable } from '../../types';

export const crateText = ({ cx, cy, text, editable = false }): D3Callable => group => {
  // eslint-disable indent
  group.selectAll('text')
    .data(!editable && text ? ['_readonly_'] : [])
    .join('text')
    .style('pointer-events', 'none')
    .style('dominant-baseline', 'central')
    .style('text-anchor', 'middle')
    .attr('x', cx)
    .attr('y', cy)
    .text(text);

  // TODO(burdon): Loses focus when hover status changes.
  group
    .selectAll('foreignObject')
    .data(editable ? ['_editable_'] : [])
    .join(enter => {
      // TODO(burdon): Not visible until repainted (even though created).
      if (editable) console.log(':::', enter.nodes().length);
      // TODO(burdon): Event handler (and remove on exit).
      return enter
        .append('foreignObject')
        .append('xhtml:input')
        .attr('type', 'text')
        .attr('width', '100%');
    })
    .attr('value', text)
    .attr('x', cx - 50)
    .attr('y', cy - 8)
    .attr('width', 100) // TODO(burdon): Width of item.
    .attr('height', 32)
  // eslint-enable indent
};
