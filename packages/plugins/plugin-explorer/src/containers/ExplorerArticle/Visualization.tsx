//
// Copyright 2026 DXOS.org
//

import { curveCatmullRom, line as d3Line } from 'd3';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Obj } from '@dxos/echo';
import { type ThemedClassName } from '@dxos/react-ui';
import {
  CLUSTER_NODE_TYPE_GROUP,
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
  type RenderNode,
  SVG,
  type SVGContext,
  type SwarmNode,
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
  const containerRef = useRef<HTMLDivElement | null>(null);

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
    setProjector(createProjector(variant, svgRef.current, lastLayoutRef.current));
  }, [variant]);

  const renderNode = useMemo(() => createRenderNode(variant), [variant]);

  // Per-tick polyline-points update for boid trails. The base GraphRenderer only writes
  // transform + edge `d` on `applyPositions`, so we listen to the same emit and rewrite
  // each `polyline.dx-swarm-tail`'s `points` in local node-group coords (head at 0,0,
  // history deltas trailing behind). Runs after the renderer's listener — by then the
  // node group's transform already points at the new head, so the local-coord polyline
  // visually lines up.
  // TODO(burdon): Factor out.
  useEffect(() => {
    if (variant !== 'swarm' || !(projector instanceof GraphSwarmProjector)) {
      return;
    }

    const updateTails = () => {
      const svg = svgRef.current?.svg;
      const root = svg?.querySelector('g.dx-graph') as SVGGElement | null;
      if (!root) {
        return;
      }

      // Edge opacity: 30% in swarm so trails + heads dominate over routing edges. Set
      // on the `dx-edges` group (inheritable) so we don't fight per-edge enter/exit.
      const edgesGroup = root.querySelector<SVGGElement>('g.dx-edges');
      if (edgesGroup) {
        edgesGroup.style.opacity = '0.3';
      }
      // Tail: each boid has one `<path>` traced from head (0,0 in local coords) through
      // its history (newest → oldest), and one `<linearGradient>` whose axis is aligned
      // head → oldest. The gradient stops are baked in renderNode; here we just sync the
      // gradient's vector and the path's `d` to the current frame.
      const nodeGroups = root.querySelectorAll<SVGGElement>('g.dx-node');
      nodeGroups.forEach((group) => {
        const node = (group as any).__data__ as SwarmNode | undefined;
        if (!node) {
          return;
        }
        const path = group.querySelector('path.dx-swarm-tail') as SVGPathElement | null;
        const grad = group.querySelector('linearGradient') as SVGLinearGradientElement | null;
        if (!path || !grad) {
          return;
        }
        const history = node.history ?? [];
        if (history.length === 0) {
          path.setAttribute('d', '');
          return;
        }

        const hx = node.x ?? 0;
        const hy = node.y ?? 0;
        // Build local-space points head → most-recent → … → oldest (history is push-at-end
        // so we walk it backwards), then run them through a Catmull-Rom curve generator so
        // the trail reads as a smooth arc rather than a polyline. The gradient axis below
        // is still head → oldest, so the fade stays aligned with travel direction.
        const points: Array<[number, number]> = [[0, 0]];
        for (let i = history.length - 1; i >= 0; i--) {
          points.push([history[i].x - hx, history[i].y - hy]);
        }
        path.setAttribute('d', swarmTrailLine(points) ?? '');
        // Gradient endpoints: head at (0,0), tail at oldest history point (in local coords).
        // The gradient is a straight-line projection so the fade tracks the boid's overall
        // direction of travel even when the path itself curves slightly.
        const oldest = history[0];
        grad.setAttribute('x2', String(oldest.x - hx));
        grad.setAttribute('y2', String(oldest.y - hy));
      });
    };

    updateTails();
    const cleanupListener = projector.updated.on(updateTails);
    return () => {
      cleanupListener();
      // Restore default edge opacity on variant switch so leaving swarm doesn't leak the
      // 50% style into force / lattice / cluster / bundle.
      const root = svgRef.current?.svg?.querySelector('g.dx-graph') as SVGGElement | null;
      const edgesGroup = root?.querySelector<SVGGElement>('g.dx-edges');
      if (edgesGroup) {
        edgesGroup.style.opacity = '';
      }
    };
  }, [variant, projector]);

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

  // Cursor avoidance for the SVG swarm: forward pointer position (in SVG model coords)
  // to the projector each move so the boids can steer away. The projector reads it on
  // its own tick — no React renders triggered by mouse moves.
  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (variant !== 'swarm' || !(projector instanceof GraphSwarmProjector)) {
        return;
      }
      const svg = svgRef.current?.svg;
      // Use the dx-graph group's CTM so zoom + viewBox transforms are both undone in one step,
      // landing the cursor in the same coordinate space the boids live in.
      const target = svg?.querySelector('g.dx-graph') as SVGGElement | null;
      const ctm = target?.getScreenCTM();
      if (!svg || !ctm) {
        return;
      }
      const point = svg.createSVGPoint();
      point.x = event.clientX;
      point.y = event.clientY;
      const modelPoint = point.matrixTransform(ctm.inverse());
      projector.setCursor(modelPoint.x, modelPoint.y);
    },
    [variant, projector],
  );

  const handlePointerLeave = useCallback(() => {
    if (projector instanceof GraphSwarmProjector) {
      projector.setCursor(null);
    }
  }, [projector]);

  // Cluster-only: clicking a root / group node toggles its subtree open/closed.
  const handleSelect = useCallback(
    (node: GraphLayoutNode<SpaceGraphNode>) => {
      if (
        variant !== 'cluster' ||
        !node ||
        (node.type !== CLUSTER_NODE_TYPE_ROOT && node.type !== CLUSTER_NODE_TYPE_GROUP)
      ) {
        return;
      }

      const cluster = projector as GraphClusterProjector<SpaceGraphNode> | undefined;
      cluster?.toggleCollapsed(node.id);
    },
    [variant, projector],
  );

  // Only attach pointer handlers when the SVG swarm is active — other variants don't
  // need them and we want to avoid the per-move CTM math when it'd be a no-op.
  const swarmHandlers =
    variant === 'swarm' ? { onPointerMove: handlePointerMove, onPointerLeave: handlePointerLeave } : undefined;

  return (
    <div ref={containerRef} className={mx('dx-expander relative', classNames)} {...swarmHandlers}>
      <SVG.Root ref={svgRef}>
        <SVG.Zoom extent={[1 / 2, 2]}>
          <SVG.Graph<SpaceGraphNode, SpaceGraphEdge>
            model={model}
            projector={projector}
            renderNode={renderNode}
            drag={variant === 'force'}
            highlightOnHover={variant === 'bundle'}
            onInspect={handleInspect}
            onSelect={handleSelect}
          />
        </SVG.Zoom>
        {debug && <SVG.FPS />}
      </SVG.Root>
    </div>
  );
};

/** Cross-variant tween duration. Matches the renderer's edge fade timing so node movement and edge enter/exit complete together. */
const TWEEN_MS = 500;

/**
 * Catmull-Rom curve generator (α=0.5, "centripetal") for swarm boid trails.
 * Passes through every point and avoids the looping/overshoot artifacts a plain
 * cardinal spline produces when consecutive history samples land close together.
 */
const swarmTrailLine = d3Line<[number, number]>().curve(curveCatmullRom.alpha(0.5));

const createProjector = (
  variant: ExplorerArticleVariant,
  ctx: SVGContext,
  prev?: GraphLayout<SpaceGraphNode>,
): GraphProjector<SpaceGraphNode> => {
  switch (variant) {
    case 'force':
      // Force has no `duration` — its own simulation drives motion via ticks.
      return new GraphForceProjector<SpaceGraphNode>(ctx, undefined, undefined, prev);

    case 'swarm':
      // Boids in SVG: a per-tick projector mirroring force's emit-positions pattern.
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

/** Group leaves by typename so same-type leaves cluster together — used by both the
 * cluster (visible structural nodes) and bundle (invisible routing anchors) projectors. */
const typenameGroupOf = (node: GraphLayoutNode<SpaceGraphNode>): string | undefined => {
  const obj = node.data?.data?.object;
  return obj ? (Obj.getTypename(obj) ?? '(untyped)') : undefined;
};

const createRenderNode = (variant: ExplorerArticleVariant): RenderNode<SpaceGraphNode> | undefined => {
  switch (variant) {
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
          // (head at 0,0). The listener overwrites them per tick to align with the path's
          // head → tail axis.
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

    case 'force':
      return (group, node) => {
        const r = node.r ?? 6;
        group
          .append('circle')
          .attr('r', r)
          .style('cursor', 'pointer')
          .style('fill', getNodeFillForObject(node.data?.data?.object as Obj.Unknown | undefined));
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
        if (node.type === CLUSTER_NODE_TYPE_LEAF) {
          appendRadialLeafLabel(group, node, obj, r);
        } else if (node.type === CLUSTER_NODE_TYPE_ROOT) {
          appendRootLabel(group, node, r);
        } else if (node.type === CLUSTER_NODE_TYPE_GROUP) {
          appendRadialGroupLabel(group, node, r);
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
        appendRadialLeafLabel(group, node, obj, r);
      };
  }
};

/** Fade-in duration applied to labels after the layout tween completes. */
const LABEL_FADE_MS = 200;

/**
 * Append a radial leaf label outside the ring, oriented outward. Compute orientation
 * from the TARGET position (tx/ty) — at enter time node.x/y is still at the previous
 * projector's coordinates, so using current x/y would orient the label by the
 * pre-transition layout (wrong) and the rotation wouldn't update during the tween.
 */
const appendRadialLeafLabel = (
  group: Parameters<RenderNode<SpaceGraphNode>>[0],
  node: GraphLayoutNode<SpaceGraphNode>,
  obj: Obj.Unknown | undefined,
  r: number,
): void => {
  const label = (obj && Obj.getLabel(obj)) ?? node.data?.data?.label ?? node.id;
  if (!label) {
    return;
  }

  const targetX = (node as any).tx ?? node.x ?? 0;
  const targetY = (node as any).ty ?? node.y ?? 0;
  const angleDeg = (Math.atan2(targetY, targetX) * 180) / Math.PI;
  const flipped = angleDeg > 90 || angleDeg < -90;
  group
    .append('text')
    .classed('dx-cluster-label', true)
    .attr('dy', '0.32em')
    .attr('transform', `rotate(${flipped ? angleDeg + 180 : angleDeg})`)
    .attr('x', flipped ? -(r + 4) : r + 4)
    .attr('text-anchor', flipped ? 'end' : 'start')
    .attr('opacity', 0)
    .style('cursor', 'pointer')
    .text(label)
    .transition()
    .delay(TWEEN_MS)
    .duration(LABEL_FADE_MS)
    .attr('opacity', 1);
};

const appendRadialGroupLabel = (
  group: Parameters<RenderNode<SpaceGraphNode>>[0],
  node: GraphLayoutNode<SpaceGraphNode>,
  r: number,
): void => {
  if (!node.label) {
    return;
  }

  const targetX = (node as any).tx ?? node.x ?? 0;
  const targetY = (node as any).ty ?? node.y ?? 0;
  const angleDeg = (Math.atan2(targetY, targetX) * 180) / Math.PI;
  const flipped = angleDeg > 90 || angleDeg < -90;
  group
    .append('text')
    .classed('dx-cluster-label', true)
    .classed('dx-cluster-label-group', true)
    .attr('dy', '0.32em')
    .attr('transform', `rotate(${flipped ? angleDeg + 180 : angleDeg})`)
    .attr('x', flipped ? r + 4 : -(r + 4))
    .attr('text-anchor', flipped ? 'start' : 'end')
    .attr('opacity', 0)
    .style('pointer-events', 'none')
    .text(node.label)
    .transition()
    .delay(TWEEN_MS)
    .duration(LABEL_FADE_MS)
    .attr('opacity', 1);
};

const appendRootLabel = (
  group: Parameters<RenderNode<SpaceGraphNode>>[0],
  node: GraphLayoutNode<SpaceGraphNode>,
  r: number,
): void => {
  if (!node.label) {
    return;
  }

  group
    .append('text')
    .classed('dx-cluster-label', true)
    .classed('dx-cluster-label-root', true)
    .attr('text-anchor', 'middle')
    .attr('y', -(r + 6))
    .attr('opacity', 0)
    .style('pointer-events', 'none')
    .text(node.label)
    .transition()
    .delay(TWEEN_MS)
    .duration(LABEL_FADE_MS)
    .attr('opacity', 1);
};

/** Drop the package prefix from a typename for display: `org.dxos.type.Person` → `Person`. */
const shortTypename = (typename: string): string => {
  const last = typename.split('.').pop() ?? typename;
  return last.charAt(0).toUpperCase() + last.slice(1);
};
