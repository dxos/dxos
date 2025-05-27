//
// Copyright 2021 DXOS.org
//

import { line, select } from 'd3';

import { log } from '@dxos/log';

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
  // Circle.
  const circle = group.append('circle');

  // Drag.
  if (options.drag) {
    circle.call(options.drag);
  }

  // Click.
  if (options.onNodeClick) {
    group.on('click', function (event: MouseEvent) {
      log.info('click', { node: select(this).datum() });
      const node = select<SVGElement, GraphLayoutNode<N>>(event.target as SVGGElement).datum();
      options.onNodeClick(node, event);
    });
  }

  // Label.
  if (options.labels) {
    // const g = group.append('g');
    // g.append('rect');
    // g.append('text')
    //   .style('dominant-baseline', 'middle')
    //   .text((d) => options.labels.text(d));
  }

  // Highlight.
  if (options.highlight !== false) {
    group
      .on('mouseover', function () {
        select(this).raise();
      })
      .on('mouseout', function () {
        select(this);
      });
  }
};

/**
 * Update node elements.
 * @param group
 * @param options
 */
const updateNode: D3Callable = <N>(group: D3Selection, options: GraphRendererOptions<N>) => {
  group.attr('transform', (d) => `translate(${d.x},${d.y})`);

  // Custom attributes.
  if (options.attributes?.node) {
    group.each((d, i, nodes) => {
      const { class: className } = options.attributes?.node(d);
      select(nodes[i]).classed(className, !!className);
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
    .attr('r', (d) => d.r ?? 16);

  // Update labels.
  if (options.labels) {
    const dx = (d: any, padding = 0) => ((d.r ?? 0) + 6 - padding) * (d.x > 0 ? 1 : -1);

    groupOrTransition
      .select<SVGTextElement>('text')
      .attr('class', function () {
        return (select(this.parentNode as any).datum() as GraphLayoutNode<N>).classes?.text;
      })
      .style('text-anchor', (d) => (d.x > 0 ? 'start' : 'end'))
      .attr('dx', (d) => dx(d))
      .text((d) => options.labels.text(d))
      .each(function (d) {
        const bbox = this.getBBox();
        const width = bbox.width + 8;
        const height = bbox.height + 4;
        select(this.parentElement)
          .select('rect')
          .attr('rx', 4)
          .attr('x', (d.x > 0 ? 0 : -1) * width + dx(d, 4))
          .attr('y', -height / 2 - 1)
          .attr('width', width)
          .attr('height', height);
      });
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
    .classed('edge', true)
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
      nodes.selectAll('g.node').each(function (d) {
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
      select(nodes[i]).classed(className, true);
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
      .classed('guides', true)
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
      .classed('edges', true)
      .selectAll<SVGPathElement, GraphLayoutEdge<N>>('g.edge')
      .data(layout.graph?.edges ?? [], (d) => d.id)
      .join((enter) =>
        //
        enter.append('g').classed('edge', true).call(createEdge, this.options, root.select('g.nodes')),
      )
      .call(updateEdge, this.options, layout.graph.nodes)
      .classed('node', true);

    //
    // Nodes
    //

    root
      .selectAll('g.nodes')
      .data([{ id: 'nodes' }])
      .join('g')
      .classed('nodes', true)
      .selectAll<SVGCircleElement, GraphLayoutNode<N>>('g.node')
      .data(layout.graph?.nodes ?? [], (d) => d.id)
      .join((enter) =>
        //
        enter.append('g').classed('node group', true).call(createNode, this.options),
      )
      .call(updateNode, this.options);
  }

  /**
   * Trigger path bullets.
   * @param node
   */
  fireBullet(node: GraphLayoutNode<N>) {
    select(this.root).selectAll('g.edges').selectAll('path').call(createBullets(this.root, node.id));
  }
}
