//
// Copyright 2022 DXOS.org
//

import * as d3 from 'd3';

import { D3Callable } from '../../types';

export const crateText = ({ cx, cy, text }): D3Callable => group => {
  // eslint-disable indent
  group
    .selectAll('foreignObject')
    .data(text ? [{ text }] : [])
    .join('foreignObject')
    .attr('x', cx)
    .attr('y', cy)
    .attr('width', 100)
    .attr('height', 30)
    .append('input')
    .attr('type', 'text')
    .attr('xmlns', 'http://www.w3.org/1999/xhtml')
    // .text('sss');



  return;
  group
    .selectAll('text')
    .data(text ? [{ text }] : [])
    .join('text')
    // .style('pointer-events', 'none')
    // .style('dominant-baseline', 'central')
    // .style('text-anchor', 'middle')
    .attr('contentEditable', true)
    .attr('x', cx)
    .attr('y', cy)
    // .text(text)
    .text(function(d) { return d.text })
    .on("keyup", function(d) {
      console.log(d);
      d.text = d3.select(this).text();
    });
    // eslint-enable indent
};
