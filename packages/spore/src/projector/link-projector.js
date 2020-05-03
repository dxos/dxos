//
// Copyright 2020 DxOS, Inc.
//

import * as d3 from 'd3';

import { Projector } from './projector';

const lineGenerator = d3.line()
  .x(d => d.x || 0)
  .y(d => d.y || 0);

/**
 * Render links.
 */
export class LinkProjector extends Projector {

  /**
   * @typedef LinkDatum
   * {{ id, source, target }}
   */

  onData(grid, data, { group }) {
    const { links = [] } = data;

    const root = d3.select(group)
      .selectAll('path')
        .data(links);

    root
      .enter()
        .append('path')
        .attr('id', d => d.id);

    root
      .exit()
        .remove();
  }

  onUpdate(grid, data, { group }) {
    const { transition } = this._options;

    const update = path => {
      path
        .attr('d', ({ source, target }) => {
          return lineGenerator([
            { x: source.x, y: source.y },
            { x: target.x, y: target.y }
          ]);
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
