//
// Copyright 2020 DXOS.org
//

import * as d3 from 'd3';
import { Projector } from './projector';

/**
 * Render guides.
 */
export class GuideProjector extends Projector {

  onUpdate(grid, data, { group }) {
    const { guides = [] } = data;
    const { size: { width, height } } = grid;

    d3.select(group)
      .selectAll('g')
      .data(guides, d => d.id)
      .join(
        enter => {
          enter.append('g')
            .each((d, i, nodes) => {
              switch (d.type) {
                case 'circle': {
                  d3.select(nodes[i])
                    .append('circle')
                      .attr('class', 'guide')
                      .attr('cx', d.cx)
                      .attr('cy', d.cy)
                      .attr('r', Math.min(width, height) / 2)
                      .transition()
                        .duration(1000)
                        .attr('r', d => d.r);
                }
              }
            });
        },
        update => {
          // TODO(burdon): Called on every update.
          update.select('circle')
            .attr('cx', d => d.cx)
            .attr('cy', d => d.cy)
            .attr('r', d => d.r);
        }
      );
  }
}
