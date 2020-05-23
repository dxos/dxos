//
// Copyright 2020 DxOS
//

import * as d3 from 'd3';
import { Projector } from './projector';

/**
 * Render guides.
 */
export class GuideProjector extends Projector {

  onUpdate(grid, data, { group }) {
    const { guides } = data;

    d3.select(group)
      .selectAll('g')
      .data(guides, d => d.id)
      .join(enter => enter.append('g')
        .each((d, i, nodes) => {
          switch (d.type) {
            case 'circle': {
              d3.select(nodes[i])
                .append('circle')
                .attr('cx', d.cx)
                .attr('cy', d.cy)
                .attr('r', 1000)
                .transition()
                .duration(1000)
                .attr('r', d => d.r);
            }
          }
        })
      )
      .select('circle').transition().duration(1000).attr('r', d => d.r);
  }
}
