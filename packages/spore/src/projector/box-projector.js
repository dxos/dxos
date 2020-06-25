//
// Copyright 2020 DXOS.org
//

import * as d3 from 'd3';

import { Projector } from './projector';

/**
 * Render nodes.
 */
export class BoxProjector extends Projector {

  /**
   * @typedef NodeDatum
   * {{ id, title }}
   */

  onData(grid, data, { group }) {
    const { nodes = [] } = data;

    d3.select(group)
      .selectAll('g')
        .data(nodes, d => d.id)
      .join('g')
        .attr('id', d => d.id)
        .call(group => {
          group
            .append('text')
            .text(d => d.title.substring(0, 1));

          group
            .append('rect');
        });
  }

  onUpdate(grid, data, { group }) {

    // TODO(burdon): Co-ord system (project function). From top-left. Change viewbox?
    const width = grid.scaleX(10);
    const height = Math.abs(grid.scaleY(10));

    d3.select(group)
      .selectAll('g')
      .call(group => {
        group
          .attr('transform', d => `translate(${d.x}, ${d.y - height})`);

        group
          // TODO(burdon): Adjust bounds.
          .select('text')
            .attr('dx', width / 2)
            .attr('dy', height / 2);

        group
          .select('rect')
            .attr('width', width)
            .attr('height', height);
      });
  }
}
