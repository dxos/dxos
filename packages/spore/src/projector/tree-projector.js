//
// Copyright 2020 DXOS.org
//

import * as d3 from 'd3';

import { Projector } from './projector';

/**
 * @param x angle
 * @param y depth
 */
const project = (x, y) => {
  const angle = (x - 90) / 180 * Math.PI;
  const radius = y;

  return [radius * Math.cos(angle), radius * Math.sin(angle)];
};

/**
 * Render tree.
 */
export class TreeProjector extends Projector {

  // https://github.com/d3/d3-hierarchy
  // https://observablehq.com/@d3/radial-tidy-tree
  // https://observablehq.com/@d3/hierarchical-edge-bundling?collection=@d3/d3-hierarchy
  // https://bl.ocks.org/mbostock/5672200 (v3)
  // https://bl.ocks.org/FrissAnalytics/ffbd3cb71848616957cd4c0f41738aec (radial tree v4)

  onUpdate (grid, data, { nodes, links }) {
    const nodeRadius = d => {
      return 4 + Math.max(5 - d.depth, 1) * 2;
    };

    d3.select(nodes)
      .selectAll('g')
        .data(data.descendants(), d => d.data.id)
      .join('g')
        .attr('id', d => d.data.id)
        .attr('class', 'node')
        .attr('transform', d => `translate(${project(d.x, d.y)})`)
        .call(node => {
          node
            .append('circle')
              .attr('r', nodeRadius);

          node
            .append('text')
              .attr('x', d => (8 + nodeRadius(d)) * ((d.x < 180 === !d.children) ? 1 : -1))
              .attr('dy', '.31em')
              .attr('transform', d => `rotate(${d.x < 180 ? d.x - 90 : d.x + 90})`)
              .style('text-anchor', d => (d.x < 180 === !d.children) ? 'start' : 'end')
              .text(d => {
                return d.children ? '' : d.data.title;
              });
        });

    d3.select(links)
      .selectAll('path')
        .data(data.descendants().slice(1))
      .join('path')
        .attr('id', d => d.data.id)
        .attr('class', 'link')
        .attr('d', d =>
          `M ${project(d.x, d.y)} C ${project(d.x, (d.y + d.parent.y) / 2)} ` +
          `${project(d.parent.x, (d.y + d.parent.y) / 2)} ${project(d.parent.x, d.parent.y)}`
        );
  }
}
