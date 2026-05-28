//
// Copyright 2026 DXOS.org
//

import { curveCatmullRom, line as d3Line } from 'd3';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Obj } from '@dxos/echo';
import { type ThemedClassName } from '@dxos/react-ui';
import {
  CLUSTER_NODE_TYPE_LEAF,
  CLUSTER_NODE_TYPE_ROOT,
  GraphBundleProjector,
  GraphClusterProjector,
  GraphForceProjector,
  type GraphLayout,
  type GraphLayoutNode,
  GraphLatticeProjector,
  type GraphProjector,
  GraphSwarmProjector,
  type ModelPoint,
  type RenderNode,
  SVG,
  type SVGContext,
  type SwarmNode,
  appendRadialGroupLabel,
  appendRadialLeafLabel,
  appendRootLabel,
} from '@dxos/react-ui-graph';
import { type SpaceGraphEdge, type SpaceGraphModel, type SpaceGraphNode } from '@dxos/schema';
import { mx } from '@dxos/ui-theme';

import { type TreeNode } from '#components';

import { getNodeFillForObject } from '../../util';
import { type ExplorerArticleVariant } from './variants';

export type VisualizationProps = ThemedClassName<{
  debug?: boolean;
  variant: ExplorerArticleVariant;
  model: SpaceGraphModel;
  onNodeHover?: (node: TreeNode | null, event?: MouseEvent) => void;
}>;

/**
 * Renders the active visualization variant.
 */
export const Visualization = ({ classNames, debug = true, variant, model, onNodeHover }: VisualizationProps) => {
  const svgRef = useRef<SVGContext>(null);
  const [projector, setProjector] = useState<GraphProjector<SpaceGraphNode> | undefined>();
  const projectorRef = useRef<GraphProjector<SpaceGraphNode> | undefined>(undefined);
  projectorRef.current = projector;

  // Latest layout we hand to the next SVG projector as `prev`. Captured from the live
  // projector when the variant changes so node x/y survive the swap.
  const lastLayoutRef = useRef<GraphLayout<SpaceGraphNode> | undefined>(undefined);

  // Subscribe to the graph atom — keeps it alive across child unmounts (effect-atom
  // disposes atoms with no subscribers) and triggers re-renders when query results land.
  useEffect(() => model?.subscribe(() => undefined), [model]);

  // Recreate the projector when the variant changes; snapshot the live layout first so
  // the next projector animates from where the previous one left off.
  useEffect(() => {
    if (projectorRef.current?.layout) {
      lastLayoutRef.current = projectorRef.current.layout as GraphLayout<SpaceGraphNode>;
    }
    if (!svgRef.current) {
      return;
    }

    setProjector(createProjector(svgRef.current, variant, lastLayoutRef.current));
  }, [variant]);

  const renderNode = useMemo(() => createRenderNode(variant), [variant]);

  // Per-tick swarm tail update. Receives the dx-node `<g>` after its transform is set,
  // so the polyline points + gradient axis can live in node-local coordinates.
  const applyNode = useMemo(() => (variant === 'swarm' ? applyNodeSwarm : undefined), [variant]);

  // Cursor avoidance for the SVG swarm. The Graph component hands us pre-transformed
  // SVG model coordinates — same space the boids live in.
  const handlePointerMove = useCallback(
    (point: ModelPoint) => {
      if (projector instanceof GraphSwarmProjector) {
        projector.setCursor(point.x, point.y);
      }
    },
    [projector],
  );

  const handlePointerLeave = useCallback(() => {
    if (projector instanceof GraphSwarmProjector) {
      projector.setCursor(null);
    }
  }, [projector]);

  const handleInspect = useCallback(
    (node: GraphLayoutNode<SpaceGraphNode> | null, event: MouseEvent) => {
      // null = pointerleave: forward to the shared hover handler so it can clear any preview.
      if (!node) {
        onNodeHover?.(null);
        return;
      }
      onNodeHover?.({ id: node.id, data: node.data?.data?.object }, event);
    },
    [onNodeHover],
  );

  // Only attach pointer handlers when the SVG swarm is active — other variants don't
  // need them and we want to avoid the per-move CTM math when it'd be a no-op.
  const swarmPointerProps =
    variant === 'swarm' ? { onPointerMove: handlePointerMove, onPointerLeave: handlePointerLeave } : undefined;

  return (
    <div className={mx('dx-expander relative', classNames)}>
      <SVG.Root ref={svgRef}>
        <SVG.Zoom extent={[1 / 2, 2]}>
          <SVG.Graph<SpaceGraphNode, SpaceGraphEdge>
            model={model}
            projector={projector}
            renderNode={renderNode}
            applyNode={applyNode}
            edgeOpacity={variant === 'swarm' ? 0.3 : undefined}
            drag={variant === 'force'}
            highlightOnHover={variant === 'bundle'}
            onInspect={handleInspect}
            {...swarmPointerProps}
          />
        </SVG.Zoom>
        {debug && <SVG.FPS />}
      </SVG.Root>
    </div>
  );
};

/** Cross-variant tween duration. Matches the renderer's edge fade timing so node movement and edge enter/exit complete together. */
const TWEEN_MS = 500;

/** Fade-in duration applied to labels after the layout tween completes. */
const LABEL_FADE_MS = 200;

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

const createProjector = (
  ctx: SVGContext,
  variant: ExplorerArticleVariant,
  prev?: GraphLayout<SpaceGraphNode>,
): GraphProjector<SpaceGraphNode> => {
  switch (variant) {
    case 'force':
      // Force has no `duration` — its own simulation drives motion via ticks.
      return new GraphForceProjector<SpaceGraphNode>(ctx, undefined, undefined, prev);

    case 'swarm':
      // Swarm in SVG: a per-tick projector mirroring force's emit-positions pattern.
      return new GraphSwarmProjector<SpaceGraphNode>(ctx, undefined, undefined, prev);

    case 'lattice':
      return new GraphLatticeProjector<SpaceGraphNode>(
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
      );

    case 'cluster':
      return new GraphClusterProjector<SpaceGraphNode>(
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
      );

    case 'bundle':
      return new GraphBundleProjector<SpaceGraphNode>(
        ctx,
        {
          duration: TWEEN_MS,
          groupOf: typenameGroupOf,
        },
        undefined,
        prev,
      );
  }
};

const createRenderNode = (variant: ExplorerArticleVariant): RenderNode<SpaceGraphNode> | undefined => {
  switch (variant) {
    case 'force':
      return (group, node) => {
        const r = node.r ?? 6;
        group
          .append('circle')
          .attr('r', r)
          .style('cursor', 'pointer')
          .style('fill', getNodeFillForObject(node.data?.data?.object as Obj.Unknown | undefined));
      };

    case 'swarm':
      // Match the force variant's shape so identity-by-id transitions read continuously.
      // The tail is a SINGLE `<path>` traced through head + history points; its stroke
      // uses a per-boid `<linearGradient>` that fades head → tail. Done this way (rather
      // than as N overlapping `<line>` segments) so coincident segment endpoints don't
      // compound their alpha and read as a striped trail.
      return (group, node) => {
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
      };

    case 'lattice':
      return (group, node) => {
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
      };

    case 'cluster':
      return (group, node) => {
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
      };

    case 'bundle':
      // Bundle layout renders ONLY leaves (root/group are invisible routing anchors).
      return (group, node) => {
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
      };
  }
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
