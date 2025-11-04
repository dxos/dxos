//
// Copyright 2021 DXOS.org
//

import { easeCubicOut, line, polygonHull, select } from 'd3';
import * as Clipper from 'js-clipper';

import { log } from '@dxos/log';

import { type D3Callable, type D3Selection, type Point, getCircumferencePoints } from '../../util';
import { type GraphLayout, type GraphLayoutEdge, type GraphLayoutNode } from '../types';

import { createBullets } from './bullets';
import { Renderer, type RendererOptions } from './renderer';

const createLine = line<Point>();

export type LabelOptions<NodeData = any> = {
  text: (node: GraphLayoutNode<NodeData>, highlight?: boolean) => string | undefined;
};

export type AttributesOptions<NodeData = any, EdgeData = any> = {
  node?: (node: GraphLayoutNode<NodeData>) => {
    classes?: Record<string, boolean>;
    data?: Record<string, string | undefined>;
  };

  edge?: (edge: GraphLayoutEdge<NodeData, EdgeData>) => {
    classes?: Record<string, boolean>;
    data?: Record<string, string | undefined>;
  };
};

export type GraphRendererOptions<NodeData = any, EdgeData = any> = RendererOptions<{
  drag?: D3Callable;
  arrows?: {
    start?: boolean; // TODO(burdon): Replace with marker id.
    end?: boolean;
  };
  highlight?: boolean;
  labels?: LabelOptions<NodeData>;
  subgraphs?: boolean;
  attributes?: AttributesOptions<NodeData>;
  transition?: () => any;
  onNodeClick?: (node: GraphLayoutNode<NodeData>, event: MouseEvent) => void;
  onNodePointerEnter?: (node: GraphLayoutNode<NodeData>, event: MouseEvent) => void;
  onLinkClick?: (link: GraphLayoutEdge<NodeData, EdgeData>, event: MouseEvent) => void;
}>;

// TODO(burdon): Perf
// - Leaking JS event listeners.
// - Don't update unless data changes.
// - Cache subgraph components in layout.

/**
 * Renders the Graph layout.
 */
export class GraphRenderer<NodeData = any, EdgeData = any> extends Renderer<
  GraphLayout<NodeData, EdgeData>,
  GraphRendererOptions<NodeData, EdgeData>
> {
  override render(layout: GraphLayout<NodeData, EdgeData>) {
    log('render', layout);

    const root = select(this.root);

    //
    // Guides
    //

    if (layout.guides) {
      root
        .selectAll('g.dx-guides')
        .data([{ id: 'guides' }])
        .join('g')
        .classed('dx-guides', true)
        .selectAll<SVGCircleElement, { cx: number; cy: number; r: number }>('circle')
        .data(layout.guides ?? [])
        .join(
          (enter) => enter.append('circle').attr('r', 0),
          (update) => update,
          (exit) => exit.transition().duration(500).attr('r', 0).remove(),
        )
        .attr('cx', (d) => d.cx)
        .attr('cy', (d) => d.cy)
        .attr('r', (d) => d.r);
    }

    //
    // Subgraphs (aka components)
    //

    const scale = 100;
    const offsetDistance = 24 * scale;

    if (this._options.subgraphs) {
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
        .data(components)
        .join(
          (enter) => enter.append('path').classed('dx-subgraph', true),
          (update) =>
            update.attr('d', ({ component }) => {
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
            }),
        );
    }

    //
    // Edges and nodes
    // TODO(burdon): Only call join when data changes (otherwise exit transitions are called multiple times).
    //

    const edgeGroup = root
      .selectAll('g.dx-edges')
      .data([{ id: 'edges' }], (d: any) => d.id)
      .join('g')
      .classed('dx-edges', true);

    const nodeGroup = root
      .selectAll('g.dx-nodes')
      .data([{ id: 'nodes' }], (d: any) => d.id)
      .join('g')
      .classed('dx-nodes', true);

    //
    // Nodes
    //

    nodeGroup
      .selectAll<SVGCircleElement, GraphLayoutNode<NodeData>>('g.dx-node')
      .data(layout.graph?.nodes ?? [], (d) => d.id)
      .join(
        (enter) =>
          enter
            .append('g')
            .attr('data-id', (d) => d.id)
            .attr('opacity', 1)
            .classed('dx-node', true)
            .call(createNode, this.options),
        (update) => update.call(updateNode, this.options),
        (exit) =>
          // Fade out.
          exit
            .transition()
            .ease(easeCubicOut)
            .duration(300)
            .attr('opacity', 0)
            .on('end', function (d) {
              select(this).remove();
            }),
      )
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    //
    // Edges
    //

    edgeGroup
      .selectAll<SVGPathElement, GraphLayoutEdge<NodeData, EdgeData>>('g.dx-edge')
      .data(layout.graph?.edges ?? [], (d) => d.id)
      .join(
        (enter) =>
          enter
            .append('g')
            .attr('data-id', (d) => d.id)
            .classed('dx-edge', true)
            .call(createEdge, this.options),
        (update) => update.call(updateEdge, this.options, nodeGroup).each((d) => {}),
        (exit) => exit.remove(),
      )
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  /**
   * Trigger path bullets.
   * @param node
   */
  fireBullet(node: GraphLayoutNode<NodeData>) {
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
  // TODO(burdon): Update when layout changes.
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
  if (options.labels && !options.onNodePointerEnter) {
    const g = group.append('g').classed('dx-label', true);
    g.append('line');
    g.append('rect');
    g.append('text').style('dominant-baseline', 'middle');
  }

  // Hover.
  if (options.onNodePointerEnter) {
    circle.on('pointerenter', function (event: PointerEvent) {
      const node = select<any, GraphLayoutNode<Data>>(this.parentElement).datum();
      options.onNodePointerEnter(node, event);
    });

    group.attr('data-hover', 'handled'); // TODO(burdon): ???
  } else if (options.highlight !== false) {
    circle.on('pointerenter', function () {
      select(this.closest('g.dx-node')).raise();
      if (options.labels) {
        select(this.parentElement).classed('dx-active', true).classed('dx-highlight', true);
      }
    });

    group.on('pointerleave', function () {
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
const updateNode: D3Callable = <NodeData = any, EdgeData = any>(
  group: D3Selection,
  options: GraphRendererOptions<NodeData, EdgeData>,
) => {
  group.attr('transform', (d) => (d.x != null && d.y != null ? `translate(${d.x},${d.y})` : undefined));

  // Custom attributes.
  if (options.attributes?.node) {
    try {
      group.each((d, i, nodes) => {
        const node = select(nodes[i]);
        const { classes, data } = options.attributes?.node?.(d) ?? {};
        if (classes) {
          applyClasses(node, classes);
        }
        if (data) {
          Object.entries(data).forEach(([key, value]) => {
            node.attr(`data-${key}`, value);
          });
        }
      });
    } catch (error: any) {
      log.error('updateNode', { error: error?.message });
    }
  }

  // Optional transition.
  const groupOrTransition: D3Selection = options.transition
    ? (group.transition(options.transition()) as unknown as D3Selection)
    : group;

  // Update circles.
  groupOrTransition.select<SVGCircleElement>('circle').attr('r', (d) => d.r ?? 16);

  // Update labels.
  if (options.labels) {
    const bx = 1;
    const px = 4;
    const py = 2;
    const offset = 16;
    const dx = (d: any, offset = 0) => (offset + (d.r ?? 0)) * (d.x > 0 ? 1 : -1);

    groupOrTransition
      .select<SVGTextElement>('text')
      .text((d) => options.labels.text(d))
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
const createEdge: D3Callable = <NodeData = any, EdgeData = any>(
  group: D3Selection,
  options: GraphRendererOptions<NodeData, EdgeData>,
) => {
  if (options.onLinkClick) {
    // Shadow path with wide stroke for click handler.
    group
      .append('path')
      .classed('dx-click', true)
      .on('click', (event: MouseEvent) => {
        const edge = select<SVGLineElement, GraphLayoutEdge<NodeData, EdgeData>>(
          event.target as SVGLineElement,
        ).datum();
        options.onLinkClick(edge, event);
      });
  }

  group
    .append('path')
    .attr('pointer-events', 'none')
    .attr('marker-start', () => (options.arrows?.start ? 'url(#marker-arrow-start)' : undefined))
    .attr('marker-end', () => (options.arrows?.end ? 'url(#marker-arrow-end)' : undefined));
};

/**
 * Update edge elements.
 * @param group
 * @param options
 */
const updateEdge: D3Callable = <NodeData = any, EdgeData = any>(
  group: D3Selection,
  options: GraphRendererOptions<NodeData, EdgeData>,
  nodeGroup: D3Selection,
) => {
  // Custom attributes.
  try {
    group.each((d, i, edges) => {
      const edge = select(edges[i]);
      edge.classed('dx-dashed', d.linkForce === false);
      const { classes, data } = options.attributes?.edge?.(d) ?? {};
      if (classes) {
        applyClasses(edge, classes);
      }
      if (data) {
        Object.entries(data).forEach(([key, value]) => {
          edge.attr(`data-${key}`, value);
        });
      }
    });
  } catch (error: any) {
    log.error('updateEdge', { error: error?.message });
  }

  // Optional transition.
  const groupOrTransition: D3Selection = options.transition
    ? (group.transition(options.transition()) as unknown as D3Selection)
    : group;

  groupOrTransition.selectAll<SVGPathElement, GraphLayoutEdge<NodeData, EdgeData>>('path').attr('d', function () {
    // NOTE: `d` is stale after layout is switched so get the datum from the parent element.
    const { source, target } = select(this.parentElement).datum() as GraphLayoutEdge<NodeData, EdgeData>;
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
