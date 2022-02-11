//
// Copyright 2021 DXOS.org
//

import clsx from 'clsx';
import * as d3 from 'd3';

import { D3Callable, D3Selection } from '@dxos/gem-core';

import { Renderer } from '../scene';
import { createBullets } from './bullets';
import { GraphData, GraphLink, GraphNode } from './types';
import { getCircumferencePoints } from './util';

const line = d3.line();

export type GraphLayout<T> = {
  graph: GraphData<T> // TODO(burdon): Differentiate external Graph and internal Layout Graph.
  guides?: {
    circles?: { // TODO(burdon): Replace with collection of typed guides.
      cx: number
      cy: number
      r: number
    }[]
  }
}

export type LabelOptions<T> = {
  text: (node: GraphNode<T>, highlight?: boolean) => string | undefined
}

export type ClassesOptions<T> = {
  node?: (node: GraphNode<T>) => string | undefined
  link?: (link: GraphLink<T>) => string | undefined
}

export type GraphRendererOptions<T> = {
  drag?: D3Callable
  arrows?: {
    start?: boolean // TODO(burdon): Replace with marker id.
    end?: boolean
  }
  highlight?: boolean
  labels?: LabelOptions<T>
  classes?: ClassesOptions<T>
  onNodeClick?: (node: GraphNode<T>, event: MouseEvent) => void
  onLinkClick?: (node: GraphLink<T>, event: MouseEvent) => void
}

/**
 * Create node elements.
 * @param group
 * @param options
 */
const createNode: D3Callable = <T> (group: D3Selection, options: GraphRendererOptions<T>) => {
  // Circle.
  const circle = group.append('circle');

  // Drag.
  if (options.drag) {
    circle.call(options.drag);
  }

  // Click.
  if (options.onNodeClick) {
    circle.on('click', (event: MouseEvent) => {
      const node = d3.select<SVGElement, GraphNode<T>>(event.target as SVGGElement).datum();
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
          d3.select<SVGGElement, GraphNode<T>>(this.closest('g'))
            .raise()
            .select('text')
            .text(d => options.labels.text(d, true));
        }
      })
      .on('mouseout', function () {
        // console.log(d3.select(this).datum());
        d3.select(this).classed('highlight', false);
        if (options.labels) {
          d3.select<SVGGElement, GraphNode<T>>(this.closest('g'))
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
const updateNode: D3Callable = <T> (group: D3Selection, options: GraphRendererOptions<T>) => {
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
const createLink: D3Callable = <T> (group: D3Selection, options: GraphRendererOptions<T>) => {
  if (options.onLinkClick && false) {
    // Shadow path with wide stroke for click handler.
    group.append('path')
      .attr('class', 'click')
      .on('click', (event: MouseEvent) => {
        const link = d3.select<SVGLineElement, GraphLink<T>>(event.target as SVGLineElement).datum();
        options.onLinkClick(link, event);
      });
  }

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
const updateLink: D3Callable = <T> (group: D3Selection, options: GraphRendererOptions<T>, nodes) => {
  group.selectAll<SVGPathElement, GraphLink<T>>('path')

    .attr('d', d => {
      // const { source, target } = d;
      const { source: s, target: t } = d;
      // TODO(burdon): Old links have zombie node references (but force links are up-to-date).
      const source = nodes.find(n => n.id === s.id);
      const target = nodes.find(n => n.id === t.id);
      // console.log(s === source);

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
export class GraphRenderer<T> extends Renderer<GraphLayout<T>, GraphRendererOptions<T>> {
  update (layout: GraphLayout<T>) {
    const root = d3.select(this.root);

    //
    // Guides
    //

    root.selectAll('g.guides')
      .data([{ id: 'guides' }])
      .join('g')
      .attr('class', 'guides')
      .selectAll<SVGCircleElement, { cx: number, cy: number, r: number }>('circle.guide')
        .data(layout.guides?.circles ?? [])
        .join('circle')
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
      .selectAll<SVGPathElement, GraphLink<T>>('g.link')
        .data(layout.graph?.links ?? [], d => d.id)
        .join(
          enter => enter.append('g').call(createLink, this.options)
        )
        .call(updateLink, this.options, layout.graph.nodes)
        .attr('class', d => clsx('link', this.options.classes?.link?.(d)));

    //
    // Nodes
    //

    root.selectAll('g.nodes')
      .data([{ id: 'nodes' }])
      .join('g')
      .attr('class', 'nodes')
      .selectAll<SVGCircleElement, GraphNode<T>>('g.node')
        .data(layout.graph?.nodes ?? [], d => d.id)
        .join(
          enter => enter.append('g').call(createNode, this.options)
        )
        .call(updateNode, this.options)
        .attr('class', d => clsx('node', this.options.classes?.node?.(d)));
  }

  /**
   * Trigger path bullets.
   * @param node
   */
  fireBullet (node: GraphNode<T>) {
    d3.select(this.root)
      .selectAll('g.links')
      .selectAll('path')
      .call(createBullets(this.root, node.id));
  }
}
