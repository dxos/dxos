//
// Copyright 2021 DXOS.org
//

import * as d3 from 'd3';

import { Graph } from './defs';

import { RenderOptions, Renderer } from '../scene';

const line = d3.line();

/**
 * Renders the Graph layout.
 */
export class GraphRenderer extends Renderer<Graph> {
  update (layout: Graph, options: RenderOptions = {}) {
    const { drag } = options;

    const root = d3.select(this._surface.root);

    const links = root.selectAll('g.links')
      .data([{ id: 'links' }])
      .join('g')
      .attr('class', 'links');

    links.selectAll('path')
      .data(layout.links || [])
      .join('path')
      .attr('d', d => {
        if (!d.source.initialized || !d.target.initialized) {
          return;
        }

        return line([
          [d.source.x, d.source.y],
          [d.target.x, d.target.y]
        ]);
      });

    const circles = root.selectAll('g.nodes')
      .data([{ id: 'nodes' }])
      .join('g')
      .attr('class', 'nodes');

    circles.selectAll('circle')
      .data(layout.nodes || [])
      .join('circle')
      .attr('cx', d => d.x)
      .attr('cy', d => d.y)
      .attr('r', d => d.r);

    if (drag) {
      circles.selectAll('circle')
        .call(drag);
    }
  }
}
