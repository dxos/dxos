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

  onData (grid, data, { group }) {
    const { nodes = [] } = data;

    d3.select(group)
      .selectAll('g')
        .data(nodes, d => d.id)
        .join('g')
          .attr('id', d => d.id)
          .attr('class', 'node')
          .call(group => {
            group
              .append('rect');

            group
              .append('text')
                .text(d => d.title.substring(0, 3));
          });
  }

  onUpdate (grid, data, { group }) {

    // TODO(burdon): Co-ord system (project function). From top-left. Change viewbox?
    const width = grid.scaleX(10);
    const height = Math.abs(grid.scaleY(10));
    const margin = grid.scaleX(2);

    d3.select(group)
      .selectAll('g')
      .call(group => {
        group
          .attr('transform', d => `translate(${d.x}, ${d.y - height})`);

        group
          // TODO(burdon): Adjust bounds via SVG measure functionality.
          .selectAll('text')
            .attr('dx', margin)
            .attr('dy', height - margin);

        group
          .selectAll('rect')
            .attr('width', width)
            .attr('height', height);
      });
  }
}
