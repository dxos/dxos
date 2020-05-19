//
// Copyright 2020 DxOS
//

import * as d3 from 'd3';

import { createPoints, lineGenerator } from '../layout';
import { Projector } from './projector';

/**
 * Render links.
 */
export class LinkProjector extends Projector {

  /**
   * @typedef LinkDatum
   * {{ id, source, target }}
   */

  onData(grid, data, { group }) {
    const { links = [], pulsars = [] } = data;

    if (pulsars.length) {
      console.log(pulsars);
    }

    const root = d3.select(group)
      .selectAll('path')
        .data(links);

    const paths = root
      .enter()
        .append('path')
        .attr('id', d => d.id);

    // TODO(burdon): Options.
    paths.attr('marker-end', () => 'url(#marker_arrow)');

    root
      .exit()
        .remove();
  }

  onUpdate(grid, data, { group }) {
    const { nodeRadius, showArrows = true, transition } = this._options;

    // TODO(burdon): Factor out line generation.
    const update = path => {
      path
        .attr('d', ({ source, target }) => {
          let points;
          if (showArrows && nodeRadius) {
            points = createPoints(source, target, nodeRadius, nodeRadius);
          } else {
            points = [
              { x: source.x, y: source.y },
              { x: target.x, y: target.y }
            ];
          }

          return lineGenerator(points);
        });
    };

    const active = d3.select(group)
      .selectAll('path');

    if (transition) {
      active.transition(transition()).call(update);
    } else {
      active.call(update);
    }
  }
}
