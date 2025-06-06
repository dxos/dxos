//
// Copyright 2021 DXOS.org
//

import { line, select, polygonHull } from 'd3';
import * as Clipper from 'js-clipper';

import { createBullets } from './bullets';
import { Renderer, type RendererOptions } from './renderer';
import { type GraphGuide, type GraphLayout, type GraphLayoutEdge, type GraphLayoutNode } from './types';
import { type D3Selection, type D3Callable, getCircumferencePoints, type Point } from '../util';

const createLine = line<Point>();

export type LabelOptions<N> = {
  text: (node: GraphLayoutNode<N>, highlight?: boolean) => string | undefined;
};

export type AttributesOptions<N> = {
  node?: (node: GraphLayoutNode<N>) => {
    classes?: Record<string, boolean>;
  };

  link?: (edge: GraphLayoutEdge<N>) => {
    classes?: Record<string, boolean>;
  };
};

export type GraphRendererOptions<N> = RendererOptions<{
  drag?: D3Callable;
  arrows?: {
    start?: boolean; // TODO(burdon): Replace with marker id.
    end?: boolean;
  };
  highlight?: boolean;
  labels?: LabelOptions<N>;
  subgraphs?: boolean;
  attributes?: AttributesOptions<N>;
  transition?: () => any;
  onNodeClick?: (node: GraphLayoutNode<N>, event: MouseEvent) => void;
  onNodePointerEnter?: (node: GraphLayoutNode<N>, event: MouseEvent) => void;
  onLinkClick?: (link: GraphLayoutEdge<N>, event: MouseEvent) => void;
}>;

/**
 * Renders the Graph layout.
 */
export class GraphRenderer<N> extends Renderer<GraphLayout<N>, GraphRendererOptions<N>> {
  override update(layout: GraphLayout<N>) {
    const root = select(this.root);

    //
    // Guides
    //

    root
      .selectAll('g.dx-guides')
      .data([{ id: 'guides' }])
      .join('g')
      .classed('dx-guides', true)
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
    // Subgraphs
    //

    const scale = 100;
    const offsetDistance = 24 * scale;

    // TODO(burdon): Cache components in layout.
    // TODO(burdon): Separate force system for each subgraph.
    const components = this._options.subgraphs
      ? findConnectedComponents({
          nodes: layout.graph?.nodes ?? [],
          edges: (layout.graph?.edges ?? []).map(({ source, target }) => ({ source: source.id, target: target.id })),
        })
          .filter((component) => component.length > 2)
          .map((component, i) => ({ id: `subgraph-${i}`, component }))
      : [];

    root
      .selectAll('g.dx-subgraphs')
      .data([{ id: 'subgraphs' }])
      .join('g')
      .classed('dx-subgraphs', true)
      .selectAll<SVGPathElement, { id: string }>('path')
      .data(components, (d) => d.id)
      .join(
        (enter) => enter.append('path').classed('dx-subgraph', true),
        (update) => {
          return update.attr('d', ({ component }) => {
            const points: Point[] =
              layout.graph?.nodes.filter((node) => component.includes(node.id)).map((node) => [node.x, node.y]) ?? [];

            // https://d3js.org/d3-polygon
            const hullPoints = polygonHull(points);

            // https://www.npmjs.com/package/js-clipper
            const co = new Clipper.ClipperOffset();
            const solution = [];
            const clipperPath = hullPoints.map(([x, y]) => ({ X: x * scale, Y: y * scale }));
            co.AddPath(clipperPath, Clipper.JoinType.jtRound, Clipper.EndType.etClosedPolygon);
            co.Execute(solution, offsetDistance);
            const offset = solution[0].map(({ X, Y }) => [X / scale, Y / scale]);
            return createLine([...offset, offset[0]]);
          });
        },
      );

    //
    // Edges
    //

    root
      .selectAll('g.dx-edges')
      .data([{ id: 'edges' }])
      .join('g')
      .classed('dx-edges', true)
      .selectAll<SVGPathElement, GraphLayoutEdge<N>>('g.dx-edge')
      .data(layout.graph?.edges ?? [], (d) => d.id)
      .join((enter) =>
        //
        // TODO(burdon): Strickly speaking should render nodes first but in lower group.
        enter.append('g').classed('dx-edge', true).call(createEdge, this.options, root.select('g.dx-nodes')),
      )
      .call(updateEdge, this.options, layout.graph.nodes);

    //
    // Nodes
    //

    root
      .selectAll('g.dx-nodes')
      .data([{ id: 'nodes' }])
      .join('g')
      .classed('dx-nodes', true)
      .selectAll<SVGCircleElement, GraphLayoutNode<N>>('g.dx-node')
      .data(layout.graph?.nodes ?? [], (d) => d.id)
      .join((enter) =>
        //
        enter.append('g').classed('group dx-node', true).call(createNode, this.options),
      )
      .call(updateNode, this.options);
  }

  /**
   * Trigger path bullets.
   * @param node
   */
  fireBullet(node: GraphLayoutNode<N>) {
    select(this.root).selectAll('g.dx-edges').selectAll('path').call(createBullets(this.root, node.id));
  }
}

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
    group.on('click', (event: MouseEvent) => {
      const node = select<SVGElement, GraphLayoutNode<N>>(event.target as SVGGElement).datum();
      options.onNodeClick(node, event);
    });
  }

  // Label.
  if (options.labels) {
    const g = group.append('g');
    g.append('rect');
    g.append('line');
    g.append('text')
      .style('dominant-baseline', 'middle')
      .text((d) => options.labels.text(d));
  }

  // Hover.
  if (options.onNodePointerEnter) {
    group.on('pointerenter', (event: PointerEvent) => {
      const node = select<SVGElement, GraphLayoutNode<N>>(event.target as SVGGElement).datum();
      options.onNodePointerEnter(node, event);
    });
    group.attr('data-hover', 'handled');
  } else if (options.highlight !== false) {
    circle.on('pointerenter', function () {
      select(this.parentElement).classed('dx-active', true).classed('dx-highlight', true).raise();
    });
    group.on('pointerleave', function () {
      select(this).classed('dx-active', false);
      setTimeout(() => {
        if (!select(this).classed('dx-active')) {
          select(this).classed('dx-highlight', false).lower();
        }
      }, 500);
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
      const { classes } = options.attributes?.node(d);
      if (classes) {
        applyClasses(select(nodes[i]), classes);
      }
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
    const px = 4;
    const py = 2;
    const offset = 16;
    const dx = (d: any, offset = 0) => (offset + (d.r ?? 0)) * (d.x > 0 ? 1 : -1);

    groupOrTransition
      .select<SVGTextElement>('text')
      .attr('class', function () {
        return (select(this.parentNode as any).datum() as GraphLayoutNode<N>).classes?.text;
      })
      .style('text-anchor', (d) => (d.x > 0 ? 'start' : 'end'))
      .attr('dx', (d) => dx(d, offset))
      .attr('dy', 1)
      .text((d) => options.labels.text(d))
      .each(function (d) {
        const bbox = this.getBBox();
        const width = bbox.width + px * 2;
        const height = bbox.height + py * 2;
        select(this.parentElement)
          .select('rect')
          .attr('x', dx(d, offset - px) + (d.x > 0 ? 0 : -1) * width)
          .attr('y', -height / 2)
          .attr('width', width)
          .attr('height', height)
          .attr('rx', 4);
        select(this.parentElement)
          .select('line')
          .classed('stroke-neutral-500', true)
          .attr('x1', dx(d))
          .attr('y1', 0)
          .attr('x2', dx(d, offset - px))
          .attr('y2', 0);
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
  if (options.onLinkClick) {
    // Shadow path with wide stroke for click handler.
    group
      .append('path')
      .attr('class', 'click')
      .on('click', (event: MouseEvent) => {
        const edge = select<SVGLineElement, GraphLayoutEdge<N>>(event.target as SVGLineElement).datum();
        options.onLinkClick(edge, event);
      });
  }

  group
    .append('path')
    .classed('edge', true)
    .attr('pointer-events', 'none')
    .attr('marker-start', () => (options.arrows?.start ? 'url(#marker-arrow-start)' : undefined))
    .attr('marker-end', () => (options.arrows?.end ? 'url(#marker-arrow-end)' : undefined))
    .attr('class', function () {
      return (select(this.parentNode as any).datum() as GraphLayoutEdge<N>).classes?.path;
    });
};

/**
 * Update edge elements.
 * @param group
 * @param options
 */
const updateEdge: D3Callable = <N>(group: D3Selection, options: GraphRendererOptions<N>) => {
  // Custom attributes.
  if (options.attributes?.link) {
    group.each((d, i, nodes) => {
      const { classes } = options.attributes?.link(d);
      if (classes) {
        applyClasses(select(nodes[i]), classes);
      }
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

const applyClasses = (el: D3Selection, classes: Record<string, boolean>) => {
  for (const [className, value] of Object.entries(classes)) {
    el.classed(className, value);
  }
};

/**
 * Find connected components (subgraphs) in a graph.
 */
// TODO(burdon): Factor out.
const findConnectedComponents = (graph: {
  nodes: { id: string }[];
  edges: { source: string; target: string }[];
}): string[][] => {
  const adj: Record<string, string[]> = {};
  for (const node of graph.nodes) {
    adj[node.id] = [];
  }

  for (const { source, target } of graph.edges) {
    adj[source].push(target);
    adj[target].push(source);
  }

  const visited = new Set<string>();
  const components: string[][] = [];
  for (const node of graph.nodes) {
    if (visited.has(node.id)) {
      continue;
    }

    const stack = [node.id];
    const componentIds: string[] = [];

    while (stack.length) {
      const current = stack.pop()!;
      if (visited.has(current)) {
        continue;
      }
      visited.add(current);
      componentIds.push(current);
      stack.push(...adj[current]);
    }

    components.push(componentIds);
  }

  return components;
};
