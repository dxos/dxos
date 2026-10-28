//
// Copyright 2021 DXOS.org
//

import { easeCubicOut, line, polygonHull, select } from 'd3';
import * as Clipper from 'js-clipper';

import { log } from '@dxos/log';

import { type D3Callable, type D3Selection, type Point, getCircumferencePoints } from '../../util/index.ts';
import { type GraphLayout, type GraphLayoutEdge, type GraphLayoutNode } from '../types.ts';
import { createBullets } from './bullets.ts';
import { Renderer, type RendererOptions } from './renderer.ts';

/**
 * Replace the default `<circle>` with a custom node shape. Invoked once per
 * entering node — append your own elements to the supplied `<g>`. Position and
 * `attributes.node` callbacks are still applied by the renderer.
 */
export type RenderNode<NodeData = any> = (group: D3Selection<SVGGElement>, node: GraphLayoutNode<NodeData>) => void;

const createLine = line<Point>();

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Class of the visible edge shape (a `<line>` or a `<path>`). */
const EDGE_SHAPE_CLASS = 'dx-edge-shape';

/** Class of the wide transparent edge shape that receives clicks. */
const EDGE_CLICK_CLASS = 'dx-click';

/** Below this movement (px) a coordinate write is skipped, so a settled graph does no DOM work per tick. */
const EPSILON = 0.01;

/**
 * Arrowhead drawn into a straight edge's `<polyline>`; matches the `marker-arrow-*` chevron
 * (12 marker units scaled by the 0.5px edge stroke).
 */
const ARROW_LENGTH = 6;
const ARROW_HALF_WIDTH = 3;

type EdgeTag = 'line' | 'polyline' | 'path';

type NodeEntry<NodeData> = {
  element: SVGGElement;
  node: GraphLayoutNode<NodeData>;
  /** Mutated in place; avoids building and re-parsing a `translate(...)` string per node per tick. */
  translate?: SVGTransform;
  x?: number;
  y?: number;
};

type EdgeEntry<NodeData, EdgeData> = {
  group: SVGGElement;
  edge: GraphLayoutEdge<NodeData, EdgeData>;
  /** Visible shape plus the optional click target; `<path>` when the projector supplies `edge.path`, else `<line>`. */
  shapes: SVGGeometryElement[];
  coords?: [number, number, number, number];
  pathData?: string;
};

type Subgraph<NodeData> = { id: string; nodes: GraphLayoutNode<NodeData>[] };

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

  // Per-tick work iterates these instead of re-selecting the DOM; rebuilt on every topology render.
  #nodeEntries: NodeEntry<NodeData>[] = [];
  #edgeEntries: EdgeEntry<NodeData, EdgeData>[] = [];
  #subgraphs: Subgraph<NodeData>[] = [];

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

    if (this._options.subgraphs) {
      // TODO(burdon): Separate force system for each subgraph.
      const nodesById = new Map((layout.graph?.nodes ?? []).map((node) => [node.id, node]));
      this.#subgraphs = findConnectedComponents({
        nodes: layout.graph?.nodes ?? [],
        edges: (layout.graph?.edges ?? []).map(({ source, target }) => ({ source: source.id, target: target.id })),
      })
        .filter((component) => component.length > 2)
        .map((component, i) => ({
          id: `subgraph-${i}`,
          nodes: component.flatMap((id) => nodesById.get(id) ?? []),
        }));

      root
        .selectAll('g.dx-subgraphs')
        .data([{ id: 'subgraphs' }])
        .join('g')
        .classed('dx-subgraphs', true)
        .selectAll<SVGPathElement, Subgraph<NodeData>>('path')
        .data(this.#subgraphs, (subgraph) => subgraph.id)
        .join((enter) => enter.append('path').classed('dx-subgraph', true));

      this.#updateSubgraphs();
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

    const nodeEntries: NodeEntry<NodeData>[] = [];

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
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .each((node, i, elements) => {
        nodeEntries.push({ element: elements[i] as SVGGElement, node, x: node.x, y: node.y });
      });
    this.#nodeEntries = nodeEntries;

    //
    // Edges
    //

    const edgeEntries: EdgeEntry<NodeData, EdgeData>[] = [];

    edgeGroup
      .selectAll<SVGPathElement, GraphLayoutEdge<NodeData, EdgeData>>('g.dx-edge')
      .data(layout.graph?.edges ?? [], (d) => d.id)
      .join(
        (enter) =>
          enter
            .append('g')
            .attr('data-id', (d) => d.id)
            .classed('dx-edge', true),
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
      // Apply edge attributes to enter+update — see note on nodes above.
      .call(updateEdge, this.options)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .each((edge, i, groups) => {
        const group = groups[i] as SVGGElement;
        const shapes = Array.from(group.children).filter(
          (child): child is SVGGeometryElement => child instanceof SVGGeometryElement,
        );
        const entry: EdgeEntry<NodeData, EdgeData> = { group, edge, shapes };
        writeEdge(entry, this.options);
        edgeEntries.push(entry);
      });
    this.#edgeEntries = edgeEntries;
  }

  /**
   * Fast positions-only update. Skips enter/exit, attribute callbacks, label sizing,
   * and the subgraph hull pass; just writes `transform` per node and `d` per edge.
   * Called per simulation tick / animation frame.
   */
  override applyPositions(_layout: GraphLayout<NodeData, EdgeData>) {
    if (!this.root) {
      return;
    }

    const applyNode = this.options.applyNode;
    for (const entry of this.#nodeEntries) {
      const { element, node } = entry;
      if (node.x != null && node.y != null && (moved(entry.x, node.x) || moved(entry.y, node.y))) {
        entry.x = node.x;
        entry.y = node.y;
        entry.translate ??= getTranslate(element);
        entry.translate.setTranslate(node.x, node.y);
      }
      // Per-tick consumer hook (e.g. swarm trail). Group transform is already up to date,
      // so node-local coords land in the same frame as the head position.
      applyNode?.(element, node);
    }

    for (const entry of this.#edgeEntries) {
      writeEdge(entry, this.options);
    }

    this.#updateSubgraphs();
  }

  /** Hulls follow their nodes, so they are recomputed whenever positions change. */
  #updateSubgraphs() {
    if (!this.root || !this._options.subgraphs) {
      return;
    }

    select(this.root)
      .select('g.dx-subgraphs')
      .selectAll<SVGPathElement, Subgraph<NodeData>>('path')
      .attr('d', ({ nodes }) => createHull(nodes));
  }

  /**
   * Trigger path bullets.
   * @param node
   */
  fireBullet(node: GraphLayoutNode<NodeData>) {
    if (!this.root) {
      return;
    }
    select(this.root).selectAll('g.dx-edges').selectAll(`.${EDGE_SHAPE_CLASS}`).call(createBullets(this.root, node.id));
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
    const g = group.append('g').classed('dx-graph-label', true);
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
  // Only nodes whose hidden state flipped get a transition; restarting it on every node each render
  // interrupts in-flight fades and schedules hundreds of no-op tweens.
  const toggled = group.filter(function (d) {
    return (this as Element).classList.contains('dx-hidden') !== (d.hidden ?? false);
  });
  toggled.classed('dx-hidden', (d) => d.hidden ?? false);
  toggled
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
 * Update edge attributes (classes and data attributes); geometry is written by {@link writeEdge}.
 */
const updateEdge: D3Callable = <NodeData = any, EdgeData = any>(
  group: D3Selection,
  options: GraphRendererOptions<NodeData, EdgeData>,
) => {
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
};

/**
 * Create the edge's shapes: `<path>` for projector-supplied geometry, otherwise `<line>`, or
 * `<polyline>` when it carries arrowheads. Line and polyline geometry are plain attributes, whereas
 * a path's `d` is a CSS property, so every `d` write forces a style recalc — the dominant per-tick
 * cost for straight-edge layouts. Arrowheads are drawn into the polyline rather than as markers,
 * since painting a marker per edge cost several times the edge itself.
 */
const createEdgeShapes = <NodeData, EdgeData>(
  entry: EdgeEntry<NodeData, EdgeData>,
  options: GraphRendererOptions<NodeData, EdgeData>,
  tag: EdgeTag,
) => {
  entry.shapes.forEach((shape) => shape.remove());
  entry.shapes = [];
  entry.coords = undefined;
  entry.pathData = undefined;

  if (options.onLinkClick) {
    const click = document.createElementNS(SVG_NS, tag);
    click.classList.add(EDGE_CLICK_CLASS);
    // Inline so the edge stroke rules (including per-color ones) can't make the hit area visible or thin.
    click.style.stroke = 'transparent';
    click.style.strokeWidth = '8px';
    click.style.pointerEvents = 'stroke';
    click.addEventListener('click', (event: MouseEvent) => {
      // The group's datum is current even after a layout switch rebinds it.
      options.onLinkClick(select<SVGGElement, GraphLayoutEdge<NodeData, EdgeData>>(entry.group).datum(), event);
    });
    entry.shapes.push(click);
  }

  const shape = document.createElementNS(SVG_NS, tag);
  shape.classList.add(EDGE_SHAPE_CLASS);
  shape.setAttribute('pointer-events', 'none');
  // Straight edges stay hidden until their first endpoints are written; see writeEdge.
  if (tag !== 'path') {
    entry.shapes.forEach((click) => click.setAttribute('visibility', 'hidden'));
    shape.setAttribute('visibility', 'hidden');
  } else {
    if (options.arrows?.start) {
      shape.setAttribute('marker-start', 'url(#marker-arrow-start)');
    }
    if (options.arrows?.end) {
      shape.setAttribute('marker-end', 'url(#marker-arrow-end)');
    }
  }
  entry.shapes.push(shape);
  entry.group.append(...entry.shapes);
};

/** Write edge geometry, touching the DOM only when it changed. */
const writeEdge = <NodeData, EdgeData>(
  entry: EdgeEntry<NodeData, EdgeData>,
  options: GraphRendererOptions<NodeData, EdgeData>,
) => {
  const { edge } = entry;
  const tag: EdgeTag = edge.path != null ? 'path' : options.arrows?.start || options.arrows?.end ? 'polyline' : 'line';
  if (entry.shapes.length === 0 || entry.shapes[0].tagName !== tag) {
    createEdgeShapes(entry, options, tag);
  }

  const path = edge.path;
  if (path != null) {
    if (entry.pathData !== path) {
      entry.pathData = path;
      entry.shapes.forEach((shape) => shape.setAttribute('d', path));
    }
    return;
  }

  const { source, target } = edge;
  if (!source.initialized || !target.initialized) {
    // A zero-length line would still draw its markers, so hide it until both ends are placed.
    if (entry.coords) {
      entry.coords = undefined;
      entry.shapes.forEach((shape) => shape.setAttribute('visibility', 'hidden'));
    }
    return;
  }

  const [[x1, y1], [x2, y2]] = getCircumferencePoints([source.x, source.y], [target.x, target.y], source.r, target.r);
  const previous = entry.coords;
  if (
    previous &&
    !moved(previous[0], x1) &&
    !moved(previous[1], y1) &&
    !moved(previous[2], x2) &&
    !moved(previous[3], y2)
  ) {
    return;
  }

  if (!previous) {
    entry.shapes.forEach((shape) => shape.removeAttribute('visibility'));
  }
  entry.coords = [x1, y1, x2, y2];
  if (tag === 'polyline') {
    const points = createArrowPoints(x1, y1, x2, y2, options.arrows?.start, options.arrows?.end);
    entry.shapes.forEach((shape) => shape.setAttribute('points', points));
    return;
  }

  for (const shape of entry.shapes) {
    shape.setAttribute('x1', String(x1));
    shape.setAttribute('y1', String(y1));
    shape.setAttribute('x2', String(x2));
    shape.setAttribute('y2', String(y2));
  }
};

/**
 * Polyline points for a segment with chevron arrowheads (wing → tip → wing at each end), so a
 * single stroked shape inherits the edge's color and hover styles.
 */
const createArrowPoints = (x1: number, y1: number, x2: number, y2: number, start?: boolean, end?: boolean) => {
  const length = Math.hypot(x2 - x1, y2 - y1) || 1;
  const ux = (x2 - x1) / length;
  const uy = (y2 - y1) / length;
  const wings = (x: number, y: number, direction: number) => {
    const bx = x - ux * ARROW_LENGTH * direction;
    const by = y - uy * ARROW_LENGTH * direction;
    return [
      `${bx - uy * ARROW_HALF_WIDTH},${by + ux * ARROW_HALF_WIDTH}`,
      `${bx + uy * ARROW_HALF_WIDTH},${by - ux * ARROW_HALF_WIDTH}`,
    ];
  };

  const head = `${x1},${y1}`;
  const tail = `${x2},${y2}`;
  const points: string[] = [];
  if (start) {
    const [left, right] = wings(x1, y1, -1);
    points.push(left, head, right);
  }
  points.push(head, tail);
  if (end) {
    const [left, right] = wings(x2, y2, 1);
    points.push(left, tail, right);
  }
  return points.join(' ');
};

/** The group's single translate transform, created if the attribute was never set. */
const getTranslate = (element: SVGGElement): SVGTransform => {
  const list = element.transform.baseVal;
  const first = list.numberOfItems > 0 ? list.getItem(0) : undefined;
  if (list.numberOfItems === 1 && first?.type === SVGTransform.SVG_TRANSFORM_TRANSLATE) {
    return first;
  }
  const svg = element.ownerSVGElement;
  const transform = svg ? svg.createSVGTransform() : list.createSVGTransformFromMatrix(new DOMMatrix());
  return list.initialize(transform);
};

const moved = (previous: number | undefined, next: number) => previous == null || Math.abs(previous - next) > EPSILON;

/** Rounded, padded outline around a subgraph's nodes. */
const createHull = <NodeData>(nodes: GraphLayoutNode<NodeData>[]): string | null => {
  // Clipper works in integers, so coordinates are scaled up before the offset and back down after.
  const scale = 100;
  const offsetDistance = 24 * scale;
  const points: Point[] = nodes.filter((node) => node.x != null && node.y != null).map((node) => [node.x, node.y]);

  // https://d3js.org/d3-polygon
  const hullPoints = polygonHull(points);
  if (!hullPoints) {
    return null;
  }

  // https://www.npmjs.com/package/js-clipper
  const co = new Clipper.ClipperOffset();
  const solution = [];
  const clipperPath = hullPoints.map(([x, y]) => ({ X: x * scale, Y: y * scale }));
  co.AddPath(clipperPath, Clipper.JoinType.jtRound, Clipper.EndType.etClosedPolygon);
  co.Execute(solution, offsetDistance);
  if (solution.length === 0) {
    return null;
  }

  const offset: Point[] = solution[0].map(({ X, Y }) => [X / scale, Y / scale]);
  return createLine([...offset, offset[0]]);
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
      const path = select(this).select<SVGGeometryElement>(`.${EDGE_SHAPE_CLASS}`);
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
