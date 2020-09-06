//
// Copyright 2020 DXOS.org
//

import * as d3 from 'd3';
import clsx from 'clsx';
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
    const showLabels = this._options.node?.showLabels;
    const propertyAdapter = this._options.node?.propertyAdapter || (() => undefined);
    const { nodes = [] } = data;

    // Create selection for all nodes.
    const root = d3.select(group)
      .selectAll('g')
        .data(nodes, ({ id }) => id);

    // TODO(burdon): Make selection/highlight available to API (e.g., for linking).
    root
      .enter()
        .append('g')
        .attr('state', 'enter')
        .attr('id', d => d.id)
        .attr('class', d => clsx('node', propertyAdapter(d)?.class))
        .attr('transform', d => `translate(${d.x || 0}, ${d.y || 0})`)

        .on('mouseover', (d, i, nodes) => {
          d3.select(nodes[i]).classed('highlight', true);
        })
        .on('mouseout', (d, i, nodes) => {
          d3.select(nodes[i]).classed('highlight', false);
        })

        .call(group => {
          // TODO(burdon): Render in different layer to prevent node occlusion?
          if (showLabels) {
            group
              .append('text')
              .text(d => d.title);
          }

          group
            .append('circle')
              // TODO(burdon): Fixes drag/click issue: https://github.com/d3/d3-drag/issues/69
              .on('click', (d) => {
                this.emit('click', d);
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
    const propertyAdapter = this._options.node?.propertyAdapter || (() => undefined);
    const { transition } = this._options;

    const update = group => {
      const marginRight = 8;
      const defaultRadius = 8;
      const nodeRadius = d =>
        propertyAdapter(d)?.radius || get(d, 'layout.node.radius', get(this._options, 'node.radius', defaultRadius));

      group
        .attr('transform', d => `translate(${d.x || 0}, ${d.y || 0})`);

      // TODO(burdon): Position left/right depending on center (from layout).
      group
        .select('text')
          .attr('x', d => nodeRadius(d) + marginRight)
          .attr('dy', '.31em');

      group
        .select('circle')
          .attr('r', d => nodeRadius(d))
    };

    const root = d3.select(group);

    root
      .selectAll('g[state=enter]')
        .attr('state', 'active');

    root
      .selectAll('g[state=active]')
      .classed('selected', d => (selected === d.id))
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
