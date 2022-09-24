//
// Copyright 2021 DXOS.org
//

import * as d3 from 'd3';

import { D3Callable, D3Selection } from '@dxos/gem-core';

import { Renderer } from '../scene';
import { createBullets } from './bullets';
import { GraphLayout, GraphLayoutLink, GraphLayoutNode, GraphNode } from './types';
import { getCircumferencePoints } from './util';

export type LabelOptions<N extends GraphNode> = {
  text: (node: GraphLayoutNode<N>, highlight?: boolean) => string | undefined
}

export type AttributesOptions<N extends GraphNode> = {
  node?: (node: GraphLayoutNode<N>) => {
    class?: string
  }

  link?: (link: GraphLayoutLink<N>) => {
    class?: string
  }
}

export type GraphRendererOptions<N extends GraphNode> = {
  drag?: D3Callable
  arrows?: {
    start?: boolean // TODO(burdon): Replace with marker id.
    end?: boolean
  }
  highlight?: boolean
  labels?: LabelOptions<N>
  attributes?: AttributesOptions<N>
  onNodeClick?: (node: GraphLayoutNode<N>, event: MouseEvent) => void
  onLinkClick?: (node: GraphLayoutLink<N>, event: MouseEvent) => void
}

const line = d3.line();

/**
 * Create node elements.
 * @param group
 * @param options
 */
const createNode: D3Callable = <N extends GraphNode> (
  group: D3Selection,
  options: GraphRendererOptions<N>
) => {
  // Circle.
  const circle = group.append('circle');

  // Drag.
  if (options.drag) {
    circle.call(options.drag);
  }

  // Click.
  if (options.onNodeClick) {
    circle.on('click', (event: MouseEvent) => {
      const node = d3.select<SVGElement, GraphLayoutNode<N>>(event.target as SVGGElement).datum();
      options.onNodeClick(node, event);
    });
  }

  // Highlight.
  if (options.highlight !== false) {
    circle
      .on('mouseover', function () {
        // console.log(d3.select(this).datum());
        d3.select(this).classed('highlight', true);
        if (options.labels) {
          d3.select<SVGGElement, GraphLayoutNode<N>>(this.closest('g'))
            .raise()
            .select('text')
            .text(d => options.labels.text(d, true));
        }
      })
      .on('mouseout', function () {
        // console.log(d3.select(this).datum());
        d3.select(this).classed('highlight', false);
        if (options.labels) {
          d3.select<SVGGElement, GraphLayoutNode<N>>(this.closest('g'))
            .select('text')
            .text(d => options.labels.text(d));
        }
      });
  }

  // Label.
  if (options.labels) {
    group.append('text')
      .style('dominant-baseline', 'middle')
      .text(d => options.labels.text(d));
  }
};

/**
 * Update node elements.
 * @param group
 * @param options
 */
const updateNode: D3Callable = <N extends GraphNode> (
  group: D3Selection,
  options: GraphRendererOptions<N>
) => {
  // Custom attributes.
  if (options.attributes?.node) {
    group.each((d, i, nodes) => {
      const { class: className } = options.attributes?.node(d);
      d3.select(nodes[i]).attr('class', className);
    });
  }

  // Update circles.
  group.select<SVGCircleElement>('circle')
    .attr('cx', d => d.x)
    .attr('cy', d => d.y)
    .attr('r', d => d.r);

  // Update labels.
  if (options.labels) {
    group.select<SVGTextElement>('text')
      .style('text-anchor', d => (d.x >= 0) ? 'start' : 'end')
      .attr('dx', d => (d.r + 6) * (d.x >= 0 ? 1 : -1))
      .attr('x', d => d.x)
      .attr('y', d => d.y);
  }
};

/**
 * Create link elements.
 * @param group
 * @param options
 */
const createLink: D3Callable = <N extends GraphNode> (
  group: D3Selection,
  options: GraphRendererOptions<N>
) => {
  // if (options.onLinkClick) {
  //   // Shadow path with wide stroke for click handler.
  //   group.append('path')
  //     .attr('class', 'click')
  //     .on('click', (event: MouseEvent) => {
  //       const link = d3.select<SVGLineElement, GraphLayoutLink<N>>(event.target as SVGLineElement).datum();
  //       options.onLinkClick(link, event);
  //     });
  // }

  group.append('path')
    .attr('class', 'link')
    .attr('pointer-events', 'none')
    .attr('marker-start', () => options.arrows?.start ? 'url(#marker-arrow-start)' : undefined)
    .attr('marker-end', () => options.arrows?.end ? 'url(#marker-arrow-end)' : undefined);
};

/**
 * Update link elements.
 * @param group
 * @param options
 */
const updateLink: D3Callable = <N extends GraphNode> (
  group: D3Selection,
  options: GraphRendererOptions<N>
) => {
  // Custom attributes.
  if (options.attributes?.link) {
    group.each((d, i, nodes) => {
      const { class: className } = options.attributes?.link(d);
      d3.select(nodes[i]).attr('class', className);
    });
  }

  group.selectAll<SVGPathElement, GraphLayoutLink<N>>('path')
    .attr('d', d => {
      const { source, target } = d;
      if (!source.initialized || !target.initialized) {
        return;
      }

      return line(
        getCircumferencePoints([source.x, source.y], [target.x, target.y], source.r, target.r)
      );
    });
};

/**
 * Renders the Graph layout.
 */
export class GraphRenderer<N extends GraphNode> extends Renderer<GraphLayout<N>, GraphRendererOptions<N>> {
  update (layout: GraphLayout<N>) {
    const root = d3.select(this.root);

    //
    // Guides
    //

    root.selectAll('g.guides')
      .data([{ id: 'guides' }])
      .join('g')
      .attr('class', 'guides')
      .selectAll<SVGCircleElement, { cx: number, cy: number, r: number }>('circle.guide')
      .data(layout.guides ?? [])
      .join(
        enter => enter
          .append('circle')
          .attr('r', 0),
        update => update,
        exit => exit
          .transition()
          .duration(500)
          .attr('r', 0)
          .remove()
      )
      .attr('class', 'guide')
      .attr('cx', d => d.cx)
      .attr('cy', d => d.cy)
      .attr('r', d => d.r);

    //
    // Links
    //

    root.selectAll('g.links')
      .data([{ id: 'links' }])
      .join('g')
      .attr('class', 'links')
      .selectAll<SVGPathElement, GraphLayoutLink<N>>('g')
      .data(layout.graph?.links ?? [], d => d.id)
      .join(
        enter => enter.append('g').call(createLink, this.options)
      )
      .call(updateLink, this.options, layout.graph.nodes);

    //
    // Nodes
    //

    root.selectAll('g.nodes')
      .data([{ id: 'nodes' }])
      .join('g')
      .attr('class', 'nodes')
      .selectAll<SVGCircleElement, GraphLayoutNode<N>>('g')
      .data(layout.graph?.nodes ?? [], d => d.id)
      .join(
        enter => enter.append('g').call(createNode, this.options)
      )
      .call(updateNode, this.options);
    // .attr('class', d => clsx('node', this.options.classes?.node?.(d)));
  }

  /**
   * Trigger path bullets.
   * @param node
   */
  fireBullet (node: GraphLayoutNode<N>) {
    d3.select(this.root)
      .selectAll('g.links')
      .selectAll('path')
      .call(createBullets(this.root, node.id));
  }
}
