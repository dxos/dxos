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

export type LabelOptions<Data = any> = {
  text: (node: GraphLayoutNode<Data>, highlight?: boolean) => string | undefined;
};

export type AttributesOptions<Data = any> = {
  node?: (node: GraphLayoutNode<Data>) => {
    classes?: Record<string, boolean>;
    data?: Record<string, string>;
  };

  link?: (edge: GraphLayoutEdge<Data>) => {
    classes?: Record<string, boolean>;
  };
};

export type GraphRendererOptions<Data = any> = RendererOptions<{
  drag?: D3Callable;
  arrows?: {
    start?: boolean; // TODO(burdon): Replace with marker id.
    end?: boolean;
  };
  highlight?: boolean;
  labels?: LabelOptions<Data>;
  subgraphs?: boolean;
  attributes?: AttributesOptions<Data>;
  transition?: () => any;
  onNodeClick?: (node: GraphLayoutNode<Data>, event: MouseEvent) => void;
  onLinkClick?: (link: GraphLayoutEdge<Data>, event: MouseEvent) => void;
}>;

/**
 * Renders the Graph layout.
 */
export class GraphRenderer<Data = any> extends Renderer<GraphLayout<Data>, GraphRendererOptions<Data>> {
  override update(layout: GraphLayout<Data>) {
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
            if (solution.length > 0) {
              const offset = solution[0].map(({ X, Y }) => [X / scale, Y / scale]);
              return createLine([...offset, offset[0]]);
            }
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
      .selectAll<SVGPathElement, GraphLayoutEdge<Data>>('g.dx-edge')
      .data(layout.graph?.edges ?? [], (d) => d.id)
      .join((enter) => enter.append('g').classed('dx-edge', true).call(createEdge, this.options))
      .call(updateEdge, this.options);

    //
    // Nodes
    //

    root
      .selectAll('g.dx-nodes')
      .data([{ id: 'nodes' }])
      .join('g')
      .classed('dx-nodes', true)
      .selectAll<SVGCircleElement, GraphLayoutNode<Data>>('g.dx-node')
      .data(layout.graph?.nodes ?? [], (d) => d.id)
      .join((enter) => enter.append('g').classed('dx-node', true).call(createNode, this.options))
      .call(updateNode, this.options);
  }

  /**
   * Trigger path bullets.
   * @param node
   */
  fireBullet(node: GraphLayoutNode<Data>) {
    select(this.root).selectAll('g.dx-edges').selectAll('path').call(createBullets(this.root, node.id));
  }
}

/**
 * Create node elements.
 * @param group
 * @param options
 */
const createNode: D3Callable = <Data>(group: D3Selection, options: GraphRendererOptions<Data>) => {
  // Circle.
  const circle = group.append('circle');

  // Drag.
  if (options.drag) {
    circle.call(options.drag);
  }

  // Click.
  if (options.onNodeClick) {
    group.on('click', (event: MouseEvent) => {
      const node = select<SVGElement, GraphLayoutNode<Data>>(event.target as SVGGElement).datum();
      options.onNodeClick(node, event);
    });
  }

  // Label.
  if (options.labels) {
    const g = group.append('g').classed('dx-label', true);
    g.append('line');
    g.append('rect');
    g.append('text').style('dominant-baseline', 'middle');
  }

  // Hover.
  if (options.highlight !== false) {
    circle.on('mouseover', function () {
      select(this.closest('g.dx-node')).raise();
      if (options.labels) {
        select(this.parentElement).classed('dx-active', true).classed('dx-highlight', true);
      }
    });
    group.on('mouseleave', function () {
      if (options.labels) {
        select(this).classed('dx-active', false);
        setTimeout(() => {
          if (!select(this).classed('dx-active')) {
            select(this).classed('dx-highlight', false);
          }
        }, 300);
      }
    });
  }
};

/**
 * Update node elements.
 * @param group
 * @param options
 */
const updateNode: D3Callable = <Data = any>(group: D3Selection, options: GraphRendererOptions<Data>) => {
  group.attr('transform', (d) => `translate(${d.x},${d.y})`);

  // Custom attributes.
  if (options.attributes?.node) {
    group.each((d, i, nodes) => {
      const el = select(nodes[i]);
      const { classes, data } = options.attributes?.node(d);
      if (classes) {
        applyClasses(el, classes);
      }
      if (data) {
        Object.entries(data).forEach(([key, value]) => {
          el.attr(`data-${key}`, value);
        });
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
      return (select(this.parentNode as any).datum() as GraphLayoutNode<Data>).classes?.circle;
    })
    .attr('r', (d) => d.r ?? 16);

  // Update labels.
  if (options.labels) {
    const bx = 1;
    const px = 4;
    const py = 2;
    const offset = 16;
    const dx = (d: any, offset = 0) => (offset + (d.r ?? 0)) * (d.x > 0 ? 1 : -1);

    groupOrTransition
      .select<SVGTextElement>('text')
      .attr('class', function () {
        return (select(this.parentNode as any).datum() as GraphLayoutNode<Data>).classes?.text;
      })
      .text((d) => {
        return options.labels.text(d);
      })
      .style('text-anchor', (d) => (d.x > 0 ? 'start' : 'end'))
      .attr('dx', (d) => dx(d, offset))
      .attr('dy', 1)
      .text((d) => options.labels.text(d))
      .each(function (d) {
        // Cache bounding box.
        let bbox = d.bbox;
        if (!bbox) {
          bbox = this.getBBox();
          d.bbox = bbox;
        }

        const width = bbox.width + (bx + px) * 2;
        const height = bbox.height + py * 2;

        select(this.parentElement)
          .select('rect')
          .attr('x', dx(d, offset - (bx + px)) + (d.x > 0 ? 0 : -1) * width)
          .attr('y', -height / 2)
          .attr('width', width)
          .attr('height', height)
          .attr('rx', 4);

        select(this.parentElement)
          .select('line')
          .classed('stroke-neutral-500', true)
          .attr('x1', dx(d, 1))
          .attr('y1', 0)
          .attr('x2', dx(d, offset - (bx + px)))
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
const createEdge: D3Callable = <Data = any>(group: D3Selection, options: GraphRendererOptions<Data>) => {
  if (options.onLinkClick) {
    // Shadow path with wide stroke for click handler.
    group
      .append('path')
      .attr('class', 'click')
      .on('click', (event: MouseEvent) => {
        const edge = select<SVGLineElement, GraphLayoutEdge<Data>>(event.target as SVGLineElement).datum();
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
      return (select(this.parentNode as any).datum() as GraphLayoutEdge<Data>).classes?.path;
    });
};

/**
 * Update edge elements.
 * @param group
 * @param options
 */
const updateEdge: D3Callable = <Data = any>(group: D3Selection, options: GraphRendererOptions<Data>) => {
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

  groupOrTransition.selectAll<SVGPathElement, GraphLayoutEdge<Data>>('path').attr('d', (d) => {
    const { source, target } = d;
    if (!source.initialized || !target.initialized) {
      return;
    }

    return createLine(getCircumferencePoints([source.x, source.y], [target.x, target.y], source.r, target.r));
  });
};

// TODO(burdon): Factor out.

const applyClasses = (el: D3Selection, classes: Record<string, boolean>) => {
  for (const [className, value] of Object.entries(classes)) {
    el.classed(className, value);
  }
};

/**
 * Find connected components (subgraphs) in a graph.
 */
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
