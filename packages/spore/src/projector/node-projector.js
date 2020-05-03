//
// Copyright 2020 DxOS, Inc.
//

import * as d3 from 'd3';
import get from 'lodash.get';

import { Projector } from './projector';

/**
 * Render nodes.
 */
export class NodeProjector extends Projector {

  /**
   * @typedef NodeDatum
   * {{ id, title }}
   */

  onData(grid, data, { group }) {
    const showLabels = get(this._options, 'node.showLabels', true);
    const { nodes = [] } = data;

    const root = d3.select(group)
      .selectAll('g')
        .data(nodes, ({ id }) => id);

    root
      .enter()
        .append('g')
        .attr('state', 'enter')
        .attr('id', d => d.id)
        .attr('transform', d => `translate(${d.x || 0}, ${d.y || 0})`)

        .call(group => {
          // TODO(burdon): Render in different layer.
          if (showLabels) {
            group
              .append('text')
              .text(d => d.title);
          }

          group
            .append('circle')

              // TODO(burdon): Drag/click issue: https://github.com/d3/d3-drag/issues/69
              .on('click', (d) => {
                this.emit('click', d);
              })
              .on('mouseover', (d, i, nodes) => {
                d3.select(nodes[i]).classed('highlight', true);
              })
              .on('mouseout', (d, i, nodes) => {
                d3.select(nodes[i]).classed('highlight', false);
              });
        });

    root
      .exit()
        .each((d, i, nodes) => {
          const node = d3.select(nodes[i]);
          if (!this._options.fade) {
            node.remove();
          } else {
            if (node.attr('state') === 'exiting') {
              return;
            }

            node
              .attr('state', 'exiting')
              .transition()
              .delay(500)
              .remove();
          }
        });
  }

  onUpdate(grid, data, { group, selected }) {
    const nodeRadius = get(this._options, 'node.radius', 8);
    const { transition } = this._options;

    const update = group => {
      group
        .attr('transform', d => `translate(${d.x || 0}, ${d.y || 0})`);

      group
        .select('text')
          .attr('x', d => get(d, 'layout.node.radius', nodeRadius) + 8)
          .attr('dy', '.31em');

      group
        .select('circle')
          .classed('selected', d => (selected === d.id))
          .attr('r', d => get(d, 'layout.node.radius', nodeRadius));
    };

    const root = d3.select(group);

    root
      .selectAll('g[state=enter]')
        .attr('state', 'active');

    root
      .selectAll('g[state=active]')
      .call(group => {
        if (transition) {
          group.transition(transition()).call(update);
        } else {
          group.call(update);
        }
      });

    root
      .selectAll('g[state=exit]')
        .attr('state', 'remove')
        .select('circle')
          .transition().duration(1000)  // TODO(burdon): Options.
          .attr('r', 10);
  }
}
