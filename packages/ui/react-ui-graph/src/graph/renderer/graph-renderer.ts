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

/**
 * Replace the default `<circle>` with a custom node shape. Invoked once per
 * entering node — append your own elements to the supplied `<g>`. Position and
 * `attributes.node` callbacks are still applied by the renderer.
 */
export type RenderNode<NodeData = any> = (group: D3Selection<SVGGElement>, node: GraphLayoutNode<NodeData>) => void;

const createLine = line<Point>();

/** Duration for edge opacity transitions on enter / exit (ms). Matches node enter/exit timing. */
const EDGE_FADE_MS = 300;

/** Duration for node hide/show opacity transitions (ms). Matches the projector's tween
 * duration so a cluster collapse/expand fades opacity over the same window the position
 * is tweening toward / away from the parent group. */
const NODE_HIDE_MS = 500;

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
  /**
   * Override the default `<circle>` node shape. When set, the renderer appends
   * whatever this callback creates instead. Use for lattice rects, custom icons, etc.
   */
  renderNode?: RenderNode<NodeData>;
  /**
   * Per-tick per-node callback invoked from `applyPositions` AFTER the dx-node group's
   * transform is updated. Use it to keep node-local SVG (trail paths, gradient axes,
   * per-frame decorations) in sync with the node's current position. The group is the
   * dx-node `<g>` (head at 0,0 in local coords); the node is the live layout node.
   * Runs only on the positions fast-path; full `render` calls don't invoke it.
   */
  applyNode?: (group: SVGGElement, node: GraphLayoutNode<NodeData>) => void;
  /**
   * Opacity applied to the `dx-edges` group. Set < 1 to dim edges relative to nodes
   * (e.g. swarm trails over routing edges). Default is the inherited group opacity.
   */
  edgeOpacity?: number;
  transition?: () => any;
  /**
   * On node pointerenter, color outgoing edges orange, incoming edges sky-blue, dim
   * unrelated edges, and stroke connected nodes / dim unrelated ones. Cleared on
   * pointerleave. Designed for the bundle variant; harmless for variants where the
   * topology doesn't carry meaningful direction.
   */
  highlightOnHover?: boolean;
  onNodeClick?: (node: GraphLayoutNode<NodeData>, event: MouseEvent) => void;
  onNodePointerEnter?: (node: GraphLayoutNode<NodeData>, event: MouseEvent) => void;
  /** Fires on pointerleave from a node hit-target. Pair with `onNodePointerEnter` to clear hover state. */
  onNodePointerLeave?: (node: GraphLayoutNode<NodeData>, event: MouseEvent) => void;
  onLinkClick?: (link: GraphLayoutEdge<NodeData, EdgeData>, event: MouseEvent) => void;
}>;

/**
 * Renders the Graph layout.
 */
export class GraphRenderer<NodeData = any, EdgeData = any> extends Renderer<
  GraphLayout<NodeData, EdgeData>,
  GraphRendererOptions<NodeData, EdgeData>
> {
  // First render of this instance — used to clear DOM left behind by a previous
  // renderer pointing at the same `<g>` (e.g. when the consumer swaps projectors
  // and a new renderer is constructed for the same SVG root). Without this, the
  // previous variant's node shapes (e.g. circles) would persist as d3.join sees
  // them in the `update` set instead of `enter`.
  #firstRender = true;

  override render(layout: GraphLayout<NodeData, EdgeData>) {
    // The SVG group ref is unset between mount cycles and before the container has sized;
    // skip the render rather than throw — the projector will emit again on the next tick.
    if (!this.root) {
      return;
    }

    if (this.#firstRender) {
      this.#firstRender = false;
      // Drop any DOM left by a prior renderer so this render's `renderNode` runs from scratch.
      this.root.replaceChildren();
    }

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
    }

    //
    // Edges and nodes
    // TODO(burdon): Only call join when data changes (otherwise exit transitions are called multiple times).
    //

    const edgeGroup = root
      .selectAll('g.dx-edges')
      .data([{ id: 'edges' }], (d: any) => d.id)
      .join('g')
      .classed('dx-edges', true)
      .style('opacity', this.options.edgeOpacity != null ? String(this.options.edgeOpacity) : null);

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
            // Initial opacity matches `hidden` so a node that enters already-collapsed is
            // invisible from the first frame; updateNode's named 'hide' transition then
            // handles any subsequent toggles.
            .attr('opacity', (d) => (d.hidden ? 0 : 1))
            .classed('dx-node', true)
            .call(createNode, this.options),
        (update) => update,
        (exit) => {
          // Fade out.
          return exit
            .transition()
            .ease(easeCubicOut)
            .duration(300)
            .attr('opacity', 0)
            .on('end', function (d) {
              select(this).remove();
            });
        },
      )
      // Apply update (transform / attributes / labels) to enter+update so the first render
      // also populates `data-*` attributes and transforms — not just subsequent ticks.
      .call(updateNode, this.options)
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
        (update) => update,
        // Exit fade: edges removed by a topology change (e.g. variant switch from cluster
        // back to force replaces hierarchy edges with data edges) ease out rather than pop.
        (exit) =>
          exit
            .transition()
            .ease(easeCubicOut)
            .duration(EDGE_FADE_MS)
            .attr('opacity', 0)
            .on('end', function () {
              select(this).remove();
            }),
      )
      // Apply edge updates (paths / attributes) to enter+update — see note on nodes above.
      .call(updateEdge, this.options, nodeGroup)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  /**
   * Fast positions-only update. Skips enter/exit, attribute callbacks, label sizing,
   * and the subgraph hull pass; just writes `transform` per node and `d` per edge.
   * Called per simulation tick / animation frame.
   */
  override applyPositions(layout: GraphLayout<NodeData, EdgeData>) {
    if (!this.root) {
      return;
    }

    const root = select(this.root);

    // Transforms only — no attribute callback, no label measurement.
    const applyNode = this.options.applyNode;
    root
      .select('g.dx-nodes')
      .selectAll<SVGGElement, GraphLayoutNode<NodeData>>('g.dx-node')
      .attr('transform', (d) => (d.x != null && d.y != null ? `translate(${d.x},${d.y})` : null))
      .each(
        applyNode
          ? function (d) {
              // Per-tick consumer hook (e.g. swarm trail). Group transform is already up to date,
              // so node-local coords land in the same frame as the head position.
              applyNode(this, d);
            }
          : () => {},
      );

    // Edge geometry — either precomputed (`edge.path`) or derived from endpoint positions.
    root
      .select('g.dx-edges')
      .selectAll<SVGGElement, GraphLayoutEdge<NodeData, EdgeData>>('g.dx-edge')
      .selectAll<SVGPathElement, GraphLayoutEdge<NodeData, EdgeData>>('path')
      .attr('d', function () {
        // NOTE: `d` is stale after layout is switched so get the datum from the parent element.
        const edge = select(this.parentElement).datum() as GraphLayoutEdge<NodeData, EdgeData>;
        if (edge.path) {
          return edge.path;
        }
        const { source, target } = edge;
        if (!source.initialized || !target.initialized) {
          return null;
        }
        return createLine(getCircumferencePoints([source.x, source.y], [target.x, target.y], source.r, target.r));
      });
  }

  /**
   * Trigger path bullets.
   * @param node
   */
  fireBullet(node: GraphLayoutNode<NodeData>) {
    if (!this.root) {
      return;
    }
    select(this.root).selectAll('g.dx-edges').selectAll('path').call(createBullets(this.root, node.id));
  }
}

/**
 * Create node elements.
 * @param group
 * @param options
 */
const SHAPE_CLASS = 'dx-shape';

const renderCustomShape = <Data>(group: D3Selection, options: GraphRendererOptions<Data>) => {
  group.each(function (d) {
    const g = select<SVGGElement, GraphLayoutNode<Data>>(this);
    // Clear any previous custom shape so subsequent renders pick up updated
    // node.r / node.data without leaving stale elements behind.
    g.selectAll(`.${SHAPE_CLASS}`).remove();
    // Wrap the consumer's drawing in a `<g class="dx-shape">` so we have a
    // stable selector for the cleanup above.
    const shapeGroup = g.append('g').classed(SHAPE_CLASS, true);
    options.renderNode!(shapeGroup, d);
  });
};

const createNode: D3Callable = <Data>(group: D3Selection, options: GraphRendererOptions<Data>) => {
  // Custom node shape: consumer appends its own elements (e.g. <rect>) and the
  // renderer skips the default <circle>. Drag/hover handlers attach to the
  // wrapping <g> so the custom shape acts as the hit target.
  const useCustom = !!options.renderNode;
  if (useCustom) {
    renderCustomShape(group, options);
  }
  const hitTarget = useCustom ? group : group.append('circle');

  // Drag.
  // TODO(burdon): Update when layout changes.
  if (options.drag) {
    hitTarget.call(options.drag);
  }

  // Click. d3 invokes `on` listeners as `(event, datum)` where datum is the bound data on
  // the listener's host element (the dx-node `<g>`). Use it directly — reading from
  // `event.target` returned undefined for the inner circle / text (which don't inherit
  // __data__), and `this` plus `select(this).datum()` was producing inconsistent results
  // across HMR reloads.
  if (options.onNodeClick) {
    group.on('click', (event: MouseEvent, d: GraphLayoutNode<Data>) => {
      options.onNodeClick(d, event);
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
  if (options.onNodePointerEnter || options.onNodePointerLeave || options.highlightOnHover) {
    hitTarget.on('pointerenter', function (event: PointerEvent) {
      const node = select<any, GraphLayoutNode<Data>>(useCustom ? this : this.parentElement).datum();
      options.onNodePointerEnter?.(node, event);
      if (options.highlightOnHover) {
        applyHoverHighlight((this as Element).closest('g.dx-graph') as SVGGElement | null, node.id);
      }
    });
    hitTarget.on('pointerleave', function (event: PointerEvent) {
      const node = select<any, GraphLayoutNode<Data>>(useCustom ? this : this.parentElement).datum();
      options.onNodePointerLeave?.(node, event);
      if (options.highlightOnHover) {
        applyHoverHighlight((this as Element).closest('g.dx-graph') as SVGGElement | null, null);
      }
    });

    group.attr('data-hover', 'handled');
  } else if (options.highlight !== false && !useCustom) {
    hitTarget.on('pointerenter', function () {
      select(this.closest('g.dx-node')).raise();
      if (options.labels) {
        select(this.parentElement).classed('dx-node-active', true).classed('dx-highlight', true);
      }
    });

    group.on('pointerleave', function () {
      if (options.labels) {
        select(this).classed('dx-node-active', false);
        setTimeout(() => {
          if (!select(this).classed('dx-node-active')) {
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
  group.attr('transform', (d) => {
    return d.x != null && d.y != null ? `translate(${d.x},${d.y})` : undefined;
  });

  // Hidden state: drive pointer-events + the hover opacity via the `dx-hidden` class;
  // tween the actual opacity attribute on a named transition so it doesn't fight the
  // CSS hover transition (different namespaces, different durations).
  group.classed('dx-hidden', (d) => d.hidden ?? false);
  group
    .transition('hide')
    .ease(easeCubicOut)
    .duration(NODE_HIDE_MS)
    .attr('opacity', (d) => (d.hidden ? 0 : 1));

  // Re-run the custom shape on every full render so a topology / data update
  // refreshes geometry (e.g. lattice node.r changes on resize, fill changes on
  // typename change). The cheap fast path (`applyPositions`) doesn't touch
  // shapes, so this only runs on the rarer topology-emit code path.
  if (options.renderNode) {
    renderCustomShape(group, options);
  }

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

  // Update circles. Skipped when the consumer supplied a custom node shape.
  if (!options.renderNode) {
    groupOrTransition.select<SVGCircleElement>('circle').attr('r', (d) => d.r ?? 16);
  }

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
    const edge = select(this.parentElement).datum() as GraphLayoutEdge<NodeData, EdgeData>;
    if (edge.path) {
      return edge.path;
    }
    const { source, target } = edge;
    if (!source.initialized || !target.initialized) {
      return;
    }

    return createLine(getCircumferencePoints([source.x, source.y], [target.x, target.y], source.r, target.r));
  });
};

/**
 * Hover-driven directional highlight: when `focusedId` is set, paint outgoing edges
 * orange, incoming edges sky-blue, dim unrelated edges, stroke connected nodes, and
 * dim unrelated nodes. When `focusedId` is null, clear every inline override so the
 * graph returns to its default styling.
 */
const applyHoverHighlight = (root: SVGGElement | null, focusedId: string | null) => {
  if (!root) {
    return;
  }
  const r = select(root);
  const on = focusedId != null;

  const outgoing = new Set<string>();
  const incoming = new Set<string>();
  if (on) {
    r.select('g.dx-edges')
      .selectAll<SVGGElement, GraphLayoutEdge>('g.dx-edge')
      .each((edge) => {
        if (edge.source.id === focusedId) {
          outgoing.add(edge.target.id);
        }
        if (edge.target.id === focusedId) {
          incoming.add(edge.source.id);
        }
      });
  }

  r.select('g.dx-edges')
    .selectAll<SVGGElement, GraphLayoutEdge>('g.dx-edge')
    .each(function (edge) {
      // Visible edge path — exclude the wider transparent click target when present.
      const path = select(this).select<SVGPathElement>('path:not(.dx-click)');
      if (!on) {
        path.style('stroke', null).style('stroke-width', null).style('opacity', null);
        return;
      }
      if (edge.source.id === focusedId) {
        path.style('stroke', 'var(--color-orange-500)').style('stroke-width', '1.5px').style('opacity', null);
      } else if (edge.target.id === focusedId) {
        path.style('stroke', 'var(--color-sky-500)').style('stroke-width', '1.5px').style('opacity', null);
      } else {
        path.style('stroke', null).style('stroke-width', null).style('opacity', '0.8');
      }
    });

  r.select('g.dx-nodes')
    .selectAll<SVGGElement, GraphLayoutNode>('g.dx-node')
    .each(function (node) {
      const groupSel = select(this);
      const shape = groupSel.select<SVGGraphicsElement>('circle, rect');
      // Hidden nodes (e.g. cluster-collapsed leaves) are kept invisible via the
      // group's `opacity` attribute — set by `updateNode`. style.opacity would
      // override that attribute, so leave hidden nodes alone.
      if (node.hidden) {
        return;
      }
      if (!on) {
        groupSel.style('opacity', null);
        shape.style('stroke', null).style('stroke-width', null);
        return;
      }
      const connected = outgoing.has(node.id) || incoming.has(node.id);
      if (node.id === focusedId) {
        groupSel.style('opacity', null);
        shape.style('stroke', null).style('stroke-width', null);
      } else if (connected) {
        groupSel.style('opacity', null);
        shape.style('stroke', 'var(--color-orange-400)').style('stroke-width', '2.5px');
      } else {
        groupSel.style('opacity', '0.4');
        shape.style('stroke', null).style('stroke-width', null);
      }
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
