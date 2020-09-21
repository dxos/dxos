//
// Copyright 2020 DXOS.org
//

import * as d3 from 'd3';
import clsx from 'clsx';
import get from 'lodash.get';

import { Projector } from './projector';

// TODO(burdon): Option.
const highlight = group => group
  .on('mouseover', function () {
    d3.select(this).classed('highlight', true);
  })
  .on('mouseout', function () {
    d3.select(this).classed('highlight', false);
  });

const updateProps = (group, propertyAdapter) => group
  .attr('class', d => clsx('node', propertyAdapter(d)?.class))
  .attr('transform', d => `translate(${d.x || 0}, ${d.y || 0})`);

/**
 * Render nodes.
 */
export class NodeProjector extends Projector {

  /**
   * @typedef NodeDatum
   * {{ id, title }}
   */

  onData (grid, data, { group }) {
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

          .call(updateProps, propertyAdapter)
          .call(highlight)

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
                .on('click', (event, d) => {
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

  onUpdate (grid, data, { group, selected }) {
    const propertyAdapter = this._options.node?.propertyAdapter || (() => undefined);
    const { transition } = this._options;

    const update = group => {
      const marginRight = 8;
      const defaultRadius = 8;
      const nodeRadius = d =>
        propertyAdapter(d)?.radius || get(d, 'layout.node.radius', get(this._options, 'node.radius', defaultRadius));

      group
        // .attr('class', d => clsx('node', propertyAdapter(d)?.class))
        // .attr('transform', d => `translate(${d.x || 0}, ${d.y || 0})`);
        .call(updateProps, propertyAdapter);

      // TODO(burdon): Position left/right depending on center (from layout).
      // https://stackoverflow.com/questions/29031659/calculate-width-of-text-before-drawing-the-text
      group
        .select('text')
          .attr('x', d => nodeRadius(d) + marginRight)
          .attr('dy', '.31em');

      group
        .select('circle')
          .attr('r', d => nodeRadius(d));
    };

    const root = d3.select(group);

    root
      .selectAll('g[state=enter]')
        .attr('state', 'active');

    root
      .selectAll('g[state=active]')
      .classed('selected', d => (Array.isArray(selected) ? selected.indexOf(d.id) : selected === d.id))
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
