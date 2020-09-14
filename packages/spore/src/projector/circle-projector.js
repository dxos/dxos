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
 * Render circle.
 */
export class CircleProjector extends Projector {

  onUpdate (grid, data, { nodes, links }) {
    const nodeRadius = d => {
      return 4 + Math.max(5 - d.depth, 1) * 2;
    };

    d3.select(nodes)
      .selectAll('g')
        .data(data.descendants(), d => d.data.id)
      .join('g')
        .attr('id', d => d.data.id)
        .attr('transform', d => `translate(${project(d.x, d.y)})`)
        .call(node => {
          node
            .append('circle')
              .attr('r', nodeRadius);
        });

    d3.select(links)
      .selectAll('path')
        .data(data.descendants().slice(1))
      .join('path')
        .attr('id', d => d.data.id)
        .attr('d', d =>
          `M ${project(d.x, d.y)} C ${project(d.x, (d.y + d.parent.y) / 2)} ` +
          `${project(d.parent.x, (d.y + d.parent.y) / 2)} ${project(d.parent.x, d.parent.y)}`
        );
  }
}
