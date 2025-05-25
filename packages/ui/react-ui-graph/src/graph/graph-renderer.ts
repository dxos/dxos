//
// Copyright 2021 DXOS.org
//

import { line, select } from 'd3';

import { createBullets } from './bullets';
import { Renderer, type RendererOptions } from './renderer';
import { type GraphGuide, type GraphLayout, type GraphLayoutEdge, type GraphLayoutNode } from './types';
import { getCircumferencePoints } from './util';
import { type D3Selection, type D3Callable } from '../typings';
import { type Point } from '../util';

const createLine = line<Point>();

export type LabelOptions<N> = {
  text: (node: GraphLayoutNode<N>, highlight?: boolean) => string | undefined;
};

/**
 * @deprecated
 */
export type AttributesOptions<N> = {
  node?: (node: GraphLayoutNode<N>) => {
    class?: string;
  };

  edge?: (edge: GraphLayoutEdge<N>) => {
    class?: string;
  };
};

export type GraphRendererOptions<N> = RendererOptions &
  Partial<{
    drag?: D3Callable;
    arrows?: {
      start?: boolean; // TODO(burdon): Replace with marker id.
      end?: boolean;
    };
    highlight?: boolean;
    labels?: LabelOptions<N>;
    attributes?: AttributesOptions<N>;
    onNodeClick?: (node: GraphLayoutNode<N>, event: MouseEvent) => void;
    onEdgeClick?: (node: GraphLayoutEdge<N>, event: MouseEvent) => void;
    transition?: () => any;
  }>;

/**
 * Create node elements.
 * @param group
 * @param options
 */
const createNode: D3Callable = <N>(group: D3Selection, options: GraphRendererOptions<N>) => {
  // Label.
  if (options.labels) {
    group
      .append('text')
      .style('dominant-baseline', 'middle')
      .text((d) => options.labels.text(d));
  }

  // Circle.
  const circle = group.append('circle');

  // Drag.
  if (options.drag) {
    circle.call(options.drag);
  }

  // Click.
  if (options.onNodeClick) {
    circle.on('click', (event: MouseEvent) => {
      const node = select<SVGElement, GraphLayoutNode<N>>(event.target as SVGGElement).datum();
      options.onNodeClick(node, event);
    });
  }

  // Highlight.
  if (options.highlight !== false) {
    circle
      .on('mouseover', function () {
        // console.log(d3.select(this).datum());
        select(this).classed('highlight', true);
        if (options.labels) {
          select<SVGGElement, GraphLayoutNode<N>>(this.closest('g'))
            .raise()
            .select('text')
            .text((d) => options.labels.text(d, true));
        }
      })
      .on('mouseout', function () {
        // console.log(d3.select(this).datum());
        select(this).classed('highlight', false);
        if (options.labels) {
          select<SVGGElement, GraphLayoutNode<N>>(this.closest('g'))
            .select('text')
            .text((d) => options.labels.text(d));
        }
      });
  }
};

/**
 * Update node elements.
 * @param group
 * @param options
 */
const updateNode: D3Callable = <N>(group: D3Selection, options: GraphRendererOptions<N>) => {
  // Custom attributes.
  if (options.attributes?.node) {
    group.each((d, i, nodes) => {
      const { class: className } = options.attributes?.node(d);
      select(nodes[i]).attr('class', className);
    });
  }

  // Optional transition.
  const groupOrTransition: D3Selection = options.transition
    ? (group.transition(options.transition()) as unknown as D3Selection)
    : group;

  // Update circles.
  groupOrTransition
    .select<SVGCircleElement>('circle')
    .attr('class', function () {
      return (select(this.parentNode as any).datum() as GraphLayoutNode<N>).classes?.circle;
    })
    .attr('cx', (d) => d.x)
    .attr('cy', (d) => d.y)
    .attr('r', (d) => d.r ?? 16);

  // Update labels.
  if (options.labels) {
    groupOrTransition
      .select<SVGTextElement>('text')
      .attr('class', function () {
        return (select(this.parentNode as any).datum() as GraphLayoutNode<N>).classes?.text;
      })
      .style('text-anchor', (d) => (d.x > 0 ? 'start' : 'end'))
      .text((d) => options.labels.text(d))
      .attr('dx', (d) => ((d.r ?? 0) + 6) * (d.x > 0 ? 1 : -1))
      .attr('x', (d) => d.x)
      .attr('y', (d) => d.y);
  }
};

/**
 * Create edge elements.
 * @param group
 * @param options
 * @param nodes
 */
const createEdge: D3Callable = <N>(group: D3Selection, options: GraphRendererOptions<N>, nodes) => {
  // if (options.onEdgeClick) {
  //   // Shadow path with wide stroke for click handler.
  //   group.append('path')
  //     .attr('class', 'click')
  //     .on('click', (event: MouseEvent) => {
  //       const edge = select<SVGLineElement, GraphLayoutEdge<N>>(event.target as SVGLineElement).datum();
  //       options.onEdgeClick(edge, event);
  //     });
  // }

  group
    .append('path')
    .attr('class', 'edge')
    .attr('pointer-events', 'none')
    .attr('marker-start', () => (options.arrows?.start ? 'url(#marker-arrow-start)' : undefined))
    .attr('marker-end', () => (options.arrows?.end ? 'url(#marker-arrow-end)' : undefined))
    .attr('class', function () {
      return (select(this.parentNode as any).datum() as GraphLayoutEdge<N>).classes?.path;
    })
    .attr('d', (d) => {
      const { source, target } = d;

      // Get the current position if the node exists.
      let initSource: Point;
      let initTarget: Point;
      const getPoint = (el): Point => [parseFloat(el.attr('cx')), parseFloat(el.attr('cy'))];
      nodes.selectAll('g').each(function (d) {
        if (options.idAccessor(d) === source.id) {
          initSource = getPoint(select(this).select('circle'));
        } else if (options.idAccessor(d) === target.id) {
          initTarget = getPoint(select(this).select('circle'));
        }
      });

      const p1: Point = initSource ?? source.last ?? [source.x, source.y];
      const p2: Point = initTarget ?? target.last ?? [target.x, target.y];

      return createLine(getCircumferencePoints(p1, p2, source.r, target.r));
    });
};

/**
 * Update edge elements.
 * @param group
 * @param options
 */
const updateEdge: D3Callable = <N>(group: D3Selection, options: GraphRendererOptions<N>) => {
  // Custom attributes.
  if (options.attributes?.edge) {
    group.each((d, i, nodes) => {
      const { class: className } = options.attributes?.edge(d);
      select(nodes[i]).attr('class', className);
    });
  }

  // Optional transition.
  const groupOrTransition: D3Selection = options.transition
    ? (group.transition(options.transition()) as unknown as D3Selection)
    : group;

  groupOrTransition.selectAll<SVGPathElement, GraphLayoutEdge<N>>('path').attr('d', (d) => {
    const { source, target } = d;
    if (!source.initialized || !target.initialized) {
      return;
    }

    return createLine(getCircumferencePoints([source.x, source.y], [target.x, target.y], source.r, target.r));
  });
};

/**
 * Renders the Graph layout.
 */
export class GraphRenderer<N> extends Renderer<GraphLayout<N>, GraphRendererOptions<N>> {
  update(layout: GraphLayout<N>) {
    const root = select(this.root);

    //
    // Guides
    //

    root
      .selectAll('g.guides')
      .data([{ id: 'guides' }])
      .join('g')
      .attr('class', 'guides')
      .selectAll<SVGCircleElement, { cx: number; cy: number; r: number }>('circle')
      .data(layout.guides ?? [], (d: GraphGuide) => d.id)
      .join(
        (enter) => enter.append('circle').attr('r', 0),
        (update) => update,
        (exit) => exit.transition().duration(500).attr('r', 0).remove(),
      )
      .attr('class', (d) => d.classes?.circle)
      .attr('cx', (d) => d.cx)
      .attr('cy', (d) => d.cy)
      .attr('r', (d) => d.r);

    //
    // Edges
    //

    root
      .selectAll('g.edges')
      .data([{ id: 'edges' }])
      .join('g')
      .attr('class', 'edges')
      .selectAll<SVGPathElement, GraphLayoutEdge<N>>('g')
      .data(layout.graph?.edges ?? [], (d) => d.id)
      .join((enter) => enter.append('g').call(createEdge, this.options, root.selectAll('g.nodes')))
      .call(updateEdge, this.options, layout.graph.nodes);

    //
    // Nodes
    //

    root
      .selectAll('g.nodes')
      .data([{ id: 'nodes' }])
      .join('g')
      .attr('class', 'nodes')
      .selectAll<SVGCircleElement, GraphLayoutNode<N>>('g')
      .data(layout.graph?.nodes ?? [], (d) => d.id)
      .join((enter) => enter.append('g').call(createNode, this.options))
      .call(updateNode, this.options);
    // .attr('class', d => clsx('node', this.options.classes?.node?.(d)));
  }

  /**
   * Trigger path bullets.
   * @param node
   */
  fireBullet(node: GraphLayoutNode<N>) {
    select(this.root).selectAll('g.edges').selectAll('path').call(createBullets(this.root, node.id));
  }
}
