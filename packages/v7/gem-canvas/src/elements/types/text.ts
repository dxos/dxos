//
// Copyright 2022 DXOS.org
//

import { D3Callable } from '../../types';

export const crateText = ({ cx, cy, text }): D3Callable => group => {
  // eslint-disable indent
  group
    .selectAll('text')
    .data(text ? [text] : [])
    .join('text')
    .style('pointer-events', 'none')
    .style('dominant-baseline', 'central')
    .style('text-anchor', 'middle')
    .attr('x', cx)
    .attr('y', cy)
    .text(text);
  // eslint-enable indent
};
