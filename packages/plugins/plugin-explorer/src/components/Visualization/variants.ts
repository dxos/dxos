//
// Copyright 2026 DXOS.org
//

import { curveCatmullRom, line as d3Line } from 'd3';

import { Obj } from '@dxos/echo';
import {
  CLUSTER_NODE_TYPE_LEAF,
  CLUSTER_NODE_TYPE_ROOT,
  GraphBundleProjector,
  GraphClusterProjector,
  GraphForceProjector,
  GraphLatticeProjector,
  type GraphLayout,
  type GraphLayoutEdge,
  type GraphLayoutNode,
  GraphPlexusProjector,
  type GraphProjector,
  GraphSwarmProjector,
  GraphTreeProjector,
  PLEXUS_NODE_TYPE_FOCUS,
  PLEXUS_NODE_TYPE_RELATION,
  type PlexusRelation,
  type RenderNode,
  type SVGContext,
  type SwarmNode,
  TREE_NODE_TYPE_INBOUND,
  TREE_NODE_TYPE_ROOT,
  appendRadialGroupLabel,
  appendRadialLeafLabel,
  appendRootLabel,
} from '@dxos/react-ui-graph';
import { type SpaceGraphNode } from '@dxos/schema';

import { getNodeFillForObject } from '../../util';

/** Variants offered in the main `ExplorerArticle` toolbar. */
export type ExplorerArticleVariant = 'force' | 'cluster' | 'bundle' | 'lattice' | 'swarm' | 'plexus';

/** All variant ids, including companion-only variants not shown in the toolbar (e.g. `neighborhood`). */
export type VisualizationVariantId = ExplorerArticleVariant | 'neighborhood';

/** Options threaded to a variant's projector factory when (re)creating the live projector. */
export type CreateProjectorOptions = {
  /** Focus node id; centres ego/plexus layouts and (for plexus) dispatches to its focused layout. */
  focusId?: string;
  /** Layout snapshot from the outgoing projector so the new one animates from the prior positions. */
  prev?: GraphLayout<SpaceGraphNode>;
};

/**
 * Self-contained definition of a single visualization variant. Collecting the projector factory,
 * node renderer, per-tick hook, and interaction flags in one record keeps each variant composable:
 * adding or changing a variant touches exactly one entry rather than several parallel switches.
 */
export type VisualizationVariant = {
  value: VisualizationVariantId;
  /** Toolbar icon. */
  icon: string;
  /** Toolbar label / aria-label. */
  label: string;
  /** Build the projector that drives this variant's layout. */
  createProjector: (ctx: SVGContext, options: CreateProjectorOptions) => GraphProjector<SpaceGraphNode>;
  /** Append the SVG for a single node; omitted variants fall back to the renderer default. */
  renderNode?: RenderNode<SpaceGraphNode>;
  /** Per-tick post-transform hook (swarm tail trails). */
  applyNode?: (group: SVGGElement, node: GraphLayoutNode<SpaceGraphNode>) => void;
  /** Enable node dragging (force only). */
  drag?: boolean;
  /** Highlight connected nodes on hover (bundle only). */
  highlightOnHover?: boolean;
  /** Edge opacity override; omitted uses the renderer default. */
  edgeOpacity?: number;
  /** Clicking an object node focuses on it (plexus only). */
  focusable?: boolean;
  /** Track the cursor in model coordinates for boid avoidance (swarm only). */
  trackPointer?: boolean;
  /** Emit `onNodeHover` for preview popovers (every variant except plexus). */
  emitsHover?: boolean;
};

/** Cross-variant tween duration. Matches the renderer's edge fade timing so node movement and edge enter/exit complete together. */
const TWEEN_MS = 500;

/** Fade-in duration applied to labels after the layout tween completes. */
const LABEL_FADE_MS = 200;

/** Base radius shared by all plexus leaf + relation nodes; the focus node is double. */
const PLEXUS_LEAF_RADIUS = 5;
const PLEXUS_FOCUS_RADIUS = PLEXUS_LEAF_RADIUS * 2;

/** Base radius for neighborhood tidy-tree nodes; the root node is double. */
const TREE_NODE_RADIUS = 6;
const TREE_ROOT_RADIUS = TREE_NODE_RADIUS * 2;

/**
 * Catmull-Rom curve generator (α=0.5, "centripetal") for swarm boid trails.
 * Passes through every point and avoids the looping/overshoot artifacts a plain
 * cardinal spline produces when consecutive history samples land close together.
 */
const swarmTrailLine = d3Line<[number, number]>().curve(curveCatmullRom.alpha(0.5));

/**
 * Per-tick swarm tail update. The dx-node `<g>` transform has just been written, so we work
 * in node-local coordinates: head at (0,0), history deltas trailing behind. The single
 * `<path>` is stroked with a per-boid `<linearGradient>` whose endpoints we sync to the
 * tail axis so the fade tracks the direction of travel.
 */
const applyNodeSwarm = (group: SVGGElement, node: GraphLayoutNode<SpaceGraphNode>): void => {
  const swarm = node as SwarmNode;
  const path = group.querySelector('path.dx-swarm-tail') as SVGPathElement | null;
  const grad = group.querySelector('linearGradient') as SVGLinearGradientElement | null;
  if (!path || !grad) {
    return;
  }
  const history = swarm.history ?? [];
  if (history.length === 0) {
    path.setAttribute('d', '');
    return;
  }

  const hx = swarm.x ?? 0;
  const hy = swarm.y ?? 0;
  // Build local-space points head → most-recent → … → oldest (history is push-at-end so
  // we walk it backwards), then run them through a Catmull-Rom curve generator so the
  // trail reads as a smooth arc rather than a polyline. The gradient axis below is still
  // head → oldest, so the fade stays aligned with travel direction.
  const points: Array<[number, number]> = [[0, 0]];
  for (let i = history.length - 1; i >= 0; i--) {
    points.push([history[i].x - hx, history[i].y - hy]);
  }
  path.setAttribute('d', swarmTrailLine(points) ?? '');
  const oldest = history[0];
  grad.setAttribute('x2', String(oldest.x - hx));
  grad.setAttribute('y2', String(oldest.y - hy));
};

/**
 * Classify an edge incident to the focus into a relation group. Each relation/property gets two
 * possible nodes: one for the outgoing direction (focus is the edge source, arrow `→`) and one
 * for the incoming direction (focus is the edge target, arrow `←`), so both sides of a relation
 * fan out separately. Relations group by relation typename; references group by their top-level
 * property name. Edges not incident to the focus are ignored.
 */
const plexusRelationOf = (edge: GraphLayoutEdge<SpaceGraphNode>, focusId: string): PlexusRelation | undefined => {
  const outgoing = edge.source.id === focusId;
  const incoming = edge.target.id === focusId;
  if (!outgoing && !incoming) {
    return undefined;
  }
  const direction = outgoing ? 'out' : 'in';
  const arrow = outgoing ? '→' : '←';

  if (edge.type === 'relation') {
    const relation = (edge.data as any)?.object as Obj.Unknown | undefined;
    const typename = relation ? Obj.getTypename(relation) : undefined;
    const name = typename ? shortTypename(typename) : 'Relation';
    return { key: `relation:${direction}:${typename ?? '?'}`, label: `${name} ${arrow}` };
  }

  if (edge.type === 'ref') {
    const property = (edge.data as any)?.property as string | undefined;
    const name = property ?? 'References';
    return { key: `ref:${direction}:${property ?? '?'}`, label: `${name} ${arrow}` };
  }

  return undefined;
};

/**
 * Group leaves by typename so same-type leaves cluster together — used by both the
 * cluster (visible structural nodes) and bundle (invisible routing anchors) projectors.
 */
const typenameGroupOf = (node: GraphLayoutNode<SpaceGraphNode>): string | undefined => {
  const obj = node.data?.data?.object;
  return obj ? (Obj.getTypename(obj) ?? '(untyped)') : undefined;
};

/** Drop the package prefix from a typename for display: `org.dxos.type.Person` → `Person`. */
const shortTypename = (typename: string): string => {
  const last = typename.split('.').pop() ?? typename;
  return last.charAt(0).toUpperCase() + last.slice(1);
};

/** Resolve a leaf's display label from its ECHO object, falling back to node-level metadata. */
const labelForLeaf = (node: GraphLayoutNode<SpaceGraphNode>, obj: Obj.Unknown | undefined): string | undefined =>
  (obj && Obj.getLabel(obj)) ?? node.data?.data?.label ?? node.id;

/**
 * Append a label beside a tidy-tree node. Outgoing nodes (right side) read rightward, inbound nodes
 * (left side) read leftward, and the centred root reads above — so every label points away from the tree.
 */
const appendTreeLabel = (
  group: Parameters<RenderNode<SpaceGraphNode>>[0],
  text: string,
  r: number,
  placement: 'left' | 'right' | 'above',
): void => {
  const offset = r + 4;
  const label = group.append('text').attr('class', 'dx-cluster-label').attr('opacity', 0).style('cursor', 'pointer');
  if (placement === 'above') {
    label.attr('x', 0).attr('y', -offset).attr('text-anchor', 'middle');
  } else {
    const toLeft = placement === 'left';
    label
      .attr('dy', '0.32em')
      .attr('x', toLeft ? -offset : offset)
      .attr('text-anchor', toLeft ? 'end' : 'start');
  }
  label.text(text).transition().delay(TWEEN_MS).duration(LABEL_FADE_MS).attr('opacity', 1);
};

/**
 * All variant definitions keyed by id. Each entry fully describes one variant's layout, rendering,
 * and interaction behavior — `Visualization` looks an entry up by id via `getVariant`.
 */
const DEFINITIONS: Record<VisualizationVariantId, VisualizationVariant> = {
  force: {
    value: 'force',
    icon: 'ph--graph--regular',
    label: 'Force-directed',
    drag: true,
    emitsHover: true,
    // Force has no `duration` — its own simulation drives motion via ticks.
    createProjector: (ctx, { prev }) => new GraphForceProjector<SpaceGraphNode>(ctx, undefined, undefined, prev),
    renderNode: (group, node) => {
      const r = node.r ?? 6;
      group
        .append('circle')
        .attr('r', r)
        .style('cursor', 'pointer')
        .style('fill', getNodeFillForObject(node.data?.data?.object as Obj.Unknown | undefined));
    },
  },
  cluster: {
    value: 'cluster',
    icon: 'ph--asterisk-simple--regular',
    label: 'Radial',
    emitsHover: true,
    createProjector: (ctx, { prev }) =>
      new GraphClusterProjector<SpaceGraphNode>(
        ctx,
        {
          duration: TWEEN_MS,
          groupOf: typenameGroupOf,
          rootLabel: 'Database',
          groupLabel: shortTypename,
          // All three node kinds share the same radius — leaves, groups, and root read
          // as members of the same circle rather than ranked by size.
          rootRadius: 4,
          groupRadius: 4,
        },
        undefined,
        prev,
      ),
    renderNode: (group, node) => {
      const obj = node.data?.data?.object as Obj.Unknown | undefined;
      const r = node.r ?? 4;
      // Synthetic root / group nodes have no underlying ECHO object; render them as
      // smaller, neutral circles so the hierarchy reads as "structure + leaves".
      group
        .append('circle')
        .attr('r', r)
        .style('cursor', 'pointer')
        .style('fill', obj ? getNodeFillForObject(obj) : 'var(--color-neutral-500)');
      const labelOptions = { delay: TWEEN_MS, duration: LABEL_FADE_MS };
      if (node.type === CLUSTER_NODE_TYPE_LEAF) {
        const text = labelForLeaf(node, obj);
        if (text) {
          appendRadialLeafLabel(group, node, text, r, labelOptions);
        }
      } else if (node.type === CLUSTER_NODE_TYPE_ROOT) {
        if (node.label) {
          appendRootLabel(group, node.label, r, labelOptions);
        }
      } else {
        if (node.label) {
          appendRadialGroupLabel(group, node, node.label, r, labelOptions);
        }
      }
    },
  },
  bundle: {
    value: 'bundle',
    icon: 'ph--circles-three-plus--regular',
    label: 'Connections',
    highlightOnHover: true,
    emitsHover: true,
    createProjector: (ctx, { prev }) =>
      new GraphBundleProjector<SpaceGraphNode>(ctx, { duration: TWEEN_MS, groupOf: typenameGroupOf }, undefined, prev),
    // Bundle layout renders ONLY leaves (root/group are invisible routing anchors).
    renderNode: (group, node) => {
      const obj = node.data?.data?.object as Obj.Unknown | undefined;
      const r = node.r ?? 4;
      group
        .append('circle')
        .attr('r', r)
        .style('cursor', 'pointer')
        .style('fill', obj ? getNodeFillForObject(obj) : 'var(--color-neutral-500)');
      const text = labelForLeaf(node, obj);
      if (text) {
        appendRadialLeafLabel(group, node, text, r, { delay: TWEEN_MS, duration: LABEL_FADE_MS });
      }
    },
  },
  plexus: {
    value: 'plexus',
    icon: 'ph--share-network--regular',
    label: 'Plexus',
    focusable: true,
    // No focus → dispatch to the bundle projector (the unfocused overview). Once a node is
    // focused, switch to the focus-centric plexus layout; both receive `prev` so the swap
    // (and every re-focus) animates from the previous node positions.
    createProjector: (ctx, { focusId, prev }) => {
      if (!focusId) {
        return new GraphBundleProjector<SpaceGraphNode>(
          ctx,
          { duration: TWEEN_MS, groupOf: typenameGroupOf },
          undefined,
          prev,
        );
      }
      return new GraphPlexusProjector<SpaceGraphNode>(
        ctx,
        {
          duration: TWEEN_MS,
          focus: focusId,
          relationOf: plexusRelationOf,
          leafRadius: PLEXUS_LEAF_RADIUS,
          relationRadius: PLEXUS_LEAF_RADIUS,
          focusRadius: PLEXUS_FOCUS_RADIUS,
        },
        undefined,
        prev,
      );
    },
    // Three node kinds: the focus at the centre (larger, object fill), synthetic relation
    // nodes on the inner ring (neutral, labelled by relation/property), and object leaves on
    // the outer ring (object fill). Type tags are set by the projector.
    renderNode: (group, node) => {
      const obj = node.data?.data?.object as Obj.Unknown | undefined;
      const labelOptions = { delay: TWEEN_MS, duration: LABEL_FADE_MS };

      // Size by node type (not node.r): the renderer bakes the circle radius at enter time
      // from the tween's start value, so a node.r fallback would inherit the previous
      // variant's radius. All leaves + relations share the base size; the focus is double.
      if (node.type === PLEXUS_NODE_TYPE_RELATION) {
        const r = PLEXUS_LEAF_RADIUS;
        group.append('circle').attr('r', r).style('cursor', 'default').style('fill', 'var(--color-neutral-500)');
        if (node.label) {
          appendRadialGroupLabel(group, node, node.label, r, labelOptions);
        }
        return;
      }

      const isFocus = node.type === PLEXUS_NODE_TYPE_FOCUS;
      const r = isFocus ? PLEXUS_FOCUS_RADIUS : PLEXUS_LEAF_RADIUS;
      group
        .append('circle')
        .attr('r', r)
        .style('cursor', 'pointer')
        .style('fill', obj ? getNodeFillForObject(obj) : 'var(--color-neutral-500)');
      const text = labelForLeaf(node, obj);
      if (text) {
        if (isFocus) {
          appendRootLabel(group, text, r, labelOptions);
        } else {
          appendRadialLeafLabel(group, node, text, r, labelOptions);
        }
      }
    },
  },
  lattice: {
    value: 'lattice',
    icon: 'ph--grid-four--regular',
    label: 'Lattice',
    emitsHover: true,
    createProjector: (ctx, { prev }) =>
      new GraphLatticeProjector<SpaceGraphNode>(
        ctx,
        {
          duration: TWEEN_MS,
          // Plugin-explorer overrides the projector's force-matched default (6)
          // with a smaller node so the lattice reads as a dense matrix.
          radius: 4,
          // Cluster by typename first so same-type rects sit together; break ties by label.
          sortBy: (node: GraphLayoutNode<SpaceGraphNode>) => {
            const obj = node.data?.data?.object;
            const typename = obj ? (Obj.getTypename(obj) ?? '(untyped)') : '(untyped)';
            const label = (obj && Obj.getLabel(obj)) ?? node.data?.data?.label ?? node.id;
            return `${typename} ${label}`;
          },
        },
        undefined,
        prev,
      ),
    renderNode: (group, node) => {
      const r = node.r ?? 6;
      const sz = r * 2;
      group
        .append('rect')
        .attr('x', -r)
        .attr('y', -r)
        .attr('width', sz)
        .attr('height', sz)
        .attr('rx', r * 0.3)
        .attr('ry', r * 0.3)
        .style('cursor', 'pointer')
        .style('fill', getNodeFillForObject(node.data?.data?.object as Obj.Unknown | undefined));
    },
  },
  swarm: {
    value: 'swarm',
    icon: 'ph--microscope--regular',
    label: 'Swarm',
    edgeOpacity: 0.3,
    trackPointer: true,
    emitsHover: true,
    applyNode: applyNodeSwarm,
    // Swarm in SVG: a per-tick projector mirroring force's emit-positions pattern.
    createProjector: (ctx, { prev }) => new GraphSwarmProjector<SpaceGraphNode>(ctx, undefined, undefined, prev),
    // Match the force variant's shape so identity-by-id transitions read continuously.
    // The tail is a SINGLE `<path>` traced through head + history points; its stroke
    // uses a per-boid `<linearGradient>` that fades head → tail. Done this way (rather
    // than as N overlapping `<line>` segments) so coincident segment endpoints don't
    // compound their alpha and read as a striped trail.
    renderNode: (group, node) => {
      const fill = getNodeFillForObject(node.data?.data?.object as Obj.Unknown | undefined);
      const r = node.r ?? 6;
      const strokeWidth = Math.max(1, r * 0.6);
      // Gradient id must be unique document-wide. node.id is the DXN, which contains
      // characters (`:`, `/`, etc.) that aren't valid in NCName-style ids, so sanitize.
      const gradId = `dx-swarm-grad-${String(node.id).replace(/[^\w-]/g, '_')}`;
      const grad = group
        .append('defs')
        .append('linearGradient')
        .attr('id', gradId)
        // userSpaceOnUse so x1/y1/x2/y2 are interpreted in the dx-node's local coord space
        // (head at 0,0). The applyNode hook overwrites them per tick to align with the
        // path's head → tail axis.
        .attr('gradientUnits', 'userSpaceOnUse')
        .attr('x1', 0)
        .attr('y1', 0)
        .attr('x2', 0)
        .attr('y2', 0);
      grad.append('stop').attr('offset', 0).attr('stop-color', fill).attr('stop-opacity', 0.7);
      grad.append('stop').attr('offset', 1).attr('stop-color', fill).attr('stop-opacity', 0);
      // Path first so the head circle sits on top.
      group
        .append('path')
        .classed('dx-swarm-tail', true)
        .attr('fill', 'none')
        .attr('stroke', `url(#${gradId})`)
        .attr('stroke-width', strokeWidth)
        .attr('stroke-linecap', 'round')
        .attr('stroke-linejoin', 'round')
        .attr('pointer-events', 'none');
      group.append('circle').attr('r', r).style('cursor', 'pointer').style('fill', fill);
    },
  },
  neighborhood: {
    value: 'neighborhood',
    icon: 'ph--tree-structure--regular',
    label: 'Neighborhood',
    emitsHover: true,
    // Tidy tree: the active node (passed as `focusId`) is the root, drawn on the left and vertically
    // centred; the pre-traversed n-hop neighbourhood fans out to the right. No focus → plain ring.
    createProjector: (ctx, { focusId, prev }) =>
      new GraphTreeProjector<SpaceGraphNode>(
        ctx,
        { duration: TWEEN_MS, focus: focusId, nodeRadius: TREE_NODE_RADIUS, rootRadius: TREE_ROOT_RADIUS },
        undefined,
        prev,
      ),
    renderNode: (group, node) => {
      const obj = node.data?.data?.object as Obj.Unknown | undefined;
      const isRoot = node.type === TREE_NODE_TYPE_ROOT;
      const r = isRoot ? TREE_ROOT_RADIUS : TREE_NODE_RADIUS;
      group
        .append('circle')
        .attr('r', r)
        .style('cursor', 'pointer')
        .style('fill', obj ? getNodeFillForObject(obj) : 'var(--color-neutral-500)');
      const text = labelForLeaf(node, obj);
      if (text) {
        // Centred root labels above; inbound (left) nodes read leftward; outgoing (right) read rightward.
        const placement = isRoot ? 'above' : node.type === TREE_NODE_TYPE_INBOUND ? 'left' : 'right';
        appendTreeLabel(group, text, r, placement);
      }
    },
  },
};

/**
 * Variants offered in the main `ExplorerArticle` toolbar, in display order. Excludes companion-only
 * variants (e.g. `neighborhood`), which are addressed directly by their container via `getVariant`.
 */
export const VARIANTS: VisualizationVariant[] = (
  ['force', 'cluster', 'bundle', 'plexus', 'lattice', 'swarm'] satisfies ExplorerArticleVariant[]
).map((id) => DEFINITIONS[id]);

/** Look up a variant definition by id. */
export const getVariant = (value: VisualizationVariantId): VisualizationVariant => DEFINITIONS[value];

/** Type guard for the toolbar-selectable variants (excludes companion-only variants). */
export const isVariant = (value: unknown): value is ExplorerArticleVariant =>
  VARIANTS.some((variant) => variant.value === value);
