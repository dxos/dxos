//
// Copyright 2021 DXOS.org
//

import clsx from 'clsx';
import * as d3 from 'd3';

import { D3Callable, Point } from '@dxos/gem-core';

import { Renderer } from '../scene';
import { createBullets } from './bullets';
import { GraphData, GraphLink, GraphNode } from './types';
import { getCircumferencePoints } from './util';

const line = d3.line();

export type GraphLayout<T> = {
  graph: GraphData<T>
  guides?: {
    circles?: { // TODO(burdon): Rename.
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
    start?: boolean
    end?: boolean
  }
  labels?: LabelOptions<T>
  classes?: ClassesOptions<T>
  onNodeClick?: (node: GraphNode<T>, event: MouseEvent) => void
  onLinkClick?: (node: GraphLink<T>, event: MouseEvent) => void
}

/**
 * Render linker.
 * @param root
 * @param source
 * @param target
 * @param point
 */
// TODO(burdon): Create class?
export const linkerRenderer = (
  root: SVGGElement,
  source?: GraphNode<any>,
  target?: GraphNode<any>,
  point?: Point
) => {
  d3.select(root).selectAll('g.linker')
    .data([{ id: 'linker' }])
    .join('g')
    .attr('class', 'linker')

    .selectAll<SVGPathElement, any>('path')
    .data(source ? [{ id: 'link' }] : [])
    .join('path')
    .attr('marker-end', () => target ? 'url(#marker-arrow-end)' : 'url(#marker-dot)')
    .attr('d', () => {
      return line(
        getCircumferencePoints(
          [source.x, source.y],
          target ? [target.x, target.y] : point,
          source.r,
          target ? target.r : 1
        )
      );
    });
};

/**
 * Renders the Graph layout.
 */
export class GraphRenderer<T> extends Renderer<GraphLayout<T>, GraphRendererOptions<T>> {
  update (layout: GraphLayout<T>) {
    const { graph, guides } = layout || {};
    const root = d3.select(this.root);
    const options = this.options;

    //
    // Guides
    //

    root.selectAll('g.guides')
      .data([{ id: 'guides' }])
      .join('g')
      .attr('class', 'guides')

      .selectAll<SVGCircleElement, { cx: number, cy: number, r: number }>('circle')
      .data(guides?.circles || [])
      .join('circle')
      .attr('cx', d => d.cx)
      .attr('cy', d => d.cy)
      .attr('r', d => d.r);

    //
    // Links
    //

    const linkGroup = root.selectAll('g.links')
      .data([{ id: 'links' }])
      .join('g')
      .attr('class', 'links');

    // Create links.
    const linkGroups = linkGroup.selectAll<SVGPathElement, GraphLink<any>>('g.link')
      .data(graph?.links || [], d => d.id)
      .join(enter => {
        const g = enter.append('g')
          .attr('class', d => clsx('link', options.classes?.link?.(d)));

        if (options.onLinkClick) {
          g.append('path')
            .attr('class', 'click')
            .on('click', (event: MouseEvent) => {
              const link = d3.select<SVGLineElement, GraphLink<T>>(event.target as SVGLineElement).datum();
              options.onLinkClick(link, event);
            });
        }

        g.append('path')
          .attr('class', 'link')
          .attr('pointer-events', 'none')
          .attr('marker-start', () => options.arrows?.start ? 'url(#marker-arrow-start)' : undefined)
          .attr('marker-end', () => options.arrows?.end ? 'url(#marker-arrow-end)' : undefined);

        return g;
      });

    // Update links.
    linkGroups.selectAll<SVGPathElement, GraphLink<any>>('path')
      .attr('d', d => {
        if (!d.source.initialized || !d.target.initialized) {
          return;
        }

        return line(
          getCircumferencePoints(
            [d.source.x, d.source.y],
            [d.target.x, d.target.y],
            d.source.r,
            d.target.r
          )
        );
      });

    //
    // Nodes
    //

    const nodeGroup = root.selectAll('g.nodes')
      .data([{ id: 'nodes' }])
      .join('g')
      .attr('class', 'nodes');

    // Create nodes.
    const nodeGroups = nodeGroup.selectAll<SVGCircleElement, GraphNode<any>>('g.node')
      .data(graph?.nodes || [], d => d.id)
      .join(
        enter => {
          const g = enter.append('g');
          const circle = g.append('circle');
          if (options.drag) {
            circle.call(options.drag);
          }

          if (options.labels) {
            g.append('text')
              .text(d => options.labels.text(d));
          }

          return g;
        },
        update => update,
        exit => {
          exit.remove();
        }
      )
      .attr('class', d => clsx('node', options.classes?.node?.(d)));

    // Update labels.
    if (options.labels) {
      nodeGroups.selectAll<SVGTextElement, GraphNode<any>>('text')
        .attr('x', d => d.x)
        .attr('y', d => d.y)
        .style('text-anchor', d => (d.x >= 0) ? 'start' : 'end')
        .style('dominant-baseline', 'middle')
        .attr('dx', d => (d.r + 6) * (d.x >= 0 ? 1 : -1));
    }

    // Update circles.
    const circles = nodeGroups.selectAll<SVGCircleElement, GraphNode<any>>('circle')
      .attr('cx', d => d.x)
      .attr('cy', d => d.y)
      .attr('r', d => d.r);

    // Highlight.
    circles
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

    // Events.
    if (options.onNodeClick) {
      circles.on('click', (event: MouseEvent) => {
        const node = d3.select<SVGElement, GraphNode<T>>(event.target as SVGGElement).datum();
        options.onNodeClick(node, event);
      });
    }
  }

  fireBullet (node: GraphNode<T>) {
    d3.select(this.root)
      .selectAll('g.links')
      .selectAll('path.link')
      .call(createBullets(this.root, node.id));
  }
}
