//
// Copyright 2026 DXOS.org
//

import { RegistryContext } from '@effect-atom/atom-react';
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { Obj } from '@dxos/echo';
import { type ThemedClassName, useThemeContext } from '@dxos/react-ui';
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
  type RenderNode,
  SVG,
  type SVGContext,
} from '@dxos/react-ui-graph';
import { Flock, type FlockBoid, FlockModel, Vec2 } from '@dxos/react-ui-sfx';
import { type SpaceGraphEdge, type SpaceGraphModel, type SpaceGraphNode } from '@dxos/schema';
import { mx } from '@dxos/ui-theme';

import { type TreeNode } from '#components';

import { getNodeFillForObject } from '../../util';
import { type ExplorerArticleVariant } from './variants';

export type VisualizationProps = ThemedClassName<{
  variant: ExplorerArticleVariant;
  model: SpaceGraphModel;
  onNodeHover?: (node: TreeNode | null, event?: MouseEvent) => void;
}>;

/**
 * Renders the active visualization variant.
 *
 * For SVG variants (force, cluster, bundle, lattice), one `<SVG.Graph>` instance is
 * kept mounted; only the projector swaps. Each new projector receives the previous
 * layout so node x/y survive the swap and the projector's `animate()` tweens to the
 * new target.
 *
 * The `swarm` variant is canvas-based and uses a `FlockModel`. On entry, boids are
 * seeded from `model.graph.nodes` with positions taken from the latest SVG layout
 * (matched by node id). On exit, the boids' current positions are written back to
 * `lastLayoutRef` so the next SVG projector starts from where the swarm left off.
 */
export const Visualization = ({ classNames, variant, model, onNodeHover }: VisualizationProps) => {
  const registry = useContext(RegistryContext);
  const { themeMode } = useThemeContext();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  // Read the container's effective background so the swarm canvas matches whatever
  // surface the visualization sits on (bg-base-surface by default, but the consumer
  // can override via `classNames`). Recomputed on theme toggle. Defaults to the
  // baseSurface token values used to be hardcoded here, in case the container is
  // unmounted when the swarm enters.
  const [flockBackground, setFlockBackground] = useState<string>(themeMode === 'dark' ? '#0a0a0a' : '#fafafa');
  useEffect(() => {
    if (containerRef.current) {
      const bg = getComputedStyle(containerRef.current).backgroundColor;
      // Skip transparent fallback — Flock needs an opaque color for the trail-fade.
      if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
        setFlockBackground(bg);
      }
    }
  }, [themeMode, classNames]);

  const svgRef = useRef<SVGContext>(null);
  const [projector, setProjector] = useState<GraphProjector<SpaceGraphNode> | undefined>();
  const projectorRef = useRef<GraphProjector<SpaceGraphNode> | undefined>(undefined);
  projectorRef.current = projector;

  // Latest layout we hand to the next SVG projector as `prev` — captured both when
  // leaving an SVG variant (live projector.layout) and when leaving swarm (boid
  // positions translated back to center-origin).
  const lastLayoutRef = useRef<GraphLayout<SpaceGraphNode> | undefined>(undefined);

  // Reactive source of truth for the boid array used by the swarm view.
  const flockModel = useMemo(() => new FlockModel(registry), [registry]);

  // Subscribe to the graph atom — keeps it alive across child unmounts (effect-atom
  // disposes atoms with no subscribers) and triggers re-renders when query results land.
  const [modelRev, setModelRev] = useState(0);
  useEffect(() => model?.subscribe(() => setModelRev((r) => r + 1)), [model]);

  // Track the visualization container size so we can translate between canvas
  // (top-left origin) and graph (center origin) coordinates when entering or
  // leaving swarm.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) {
      return;
    }

    const rect = el.getBoundingClientRect();
    setSize({ width: rect.width, height: rect.height });

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }
      const { width, height } = entry.contentRect;
      setSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Recreate the projector when the variant changes. Two transitions need special handling:
  //  - leaving an SVG variant: snapshot live projector.layout into lastLayoutRef.
  //  - leaving swarm: convert current boid positions (canvas-coord) back into a
  //    center-origin layout in lastLayoutRef so the next projector animates from
  //    where the boids ended up.
  useEffect(() => {
    if (projectorRef.current?.layout) {
      lastLayoutRef.current = projectorRef.current.layout as GraphLayout<SpaceGraphNode>;
    } else if (flockModel.boids.length > 0 && size.width > 0 && size.height > 0) {
      lastLayoutRef.current = boidsToLayout(flockModel.boids, size, lastLayoutRef.current);
    }

    if (variant === 'swarm') {
      setProjector(undefined);
      return;
    }

    if (!svgRef.current) {
      return;
    }

    setProjector(createProjector(variant, svgRef.current, lastLayoutRef.current));
  }, [variant, flockModel, size.width, size.height]);

  // Seed the flock with boids derived from current graph nodes whenever we enter
  // swarm (or model data lands while in swarm). Positions are reused from the last
  // SVG layout where the id matches; otherwise a small random spread around center.
  useEffect(() => {
    if (variant !== 'swarm' || !size.width || !size.height) {
      return;
    }
    const nodes = model?.graph.nodes ?? [];
    if (nodes.length === 0) {
      return;
    }
    flockModel.setBoids(seedBoidsFromNodes(nodes, lastLayoutRef.current, size, flockModel));
  }, [variant, flockModel, model, modelRev, size.width, size.height]);

  const renderNode = useMemo(() => createRenderNode(variant), [variant]);

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

  return (
    <div ref={containerRef} className={mx('dx-expander relative', classNames)}>
      {variant === 'swarm' ? (
        <Flock model={flockModel} coloring='Movement' background={flockBackground} trail={30} />
      ) : (
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
        </SVG.Root>
      )}
    </div>
  );
};

/**
 * Build the boid set for entering swarm. For each model node, take the position from
 * `lastLayout` (id-matched), or a random spread around center if the id isn't there.
 * Position reuse keeps in-flight transitions visually continuous.
 */
const seedBoidsFromNodes = (
  nodes: readonly SpaceGraphNode[],
  lastLayout: GraphLayout<SpaceGraphNode> | undefined,
  { width, height }: { width: number; height: number },
  flockModel: FlockModel,
): FlockBoid[] => {
  const cx = width / 2;
  const cy = height / 2;
  const spread = Math.min(width, height) * 0.5;
  const snapshot = new Map((lastLayout?.graph.nodes ?? []).map((n) => [n.id, n] as const));
  return nodes.map((node) => {
    const prev = snapshot.get(node.id);
    const px = prev?.x ?? (Math.random() - 0.5) * spread;
    const py = prev?.y ?? (Math.random() - 0.5) * spread;
    // Preserve existing boid velocity/colour if we already have one for this id —
    // keeps mid-air boids moving smoothly when the model emits multiple times.
    const existing = flockModel.findBoid(node.id);
    return {
      id: node.id,
      position: new Vec2(cx + px, cy + py),
      velocity: existing?.velocity ?? new Vec2(),
      color: existing?.color,
      last: existing?.last ?? [],
    };
  });
};

/**
 * Translate canvas-coord boid positions back into a center-origin layout that the
 * next SVG projector can consume as `prev`. Matches nodes from `prevLayout` by id so
 * label / data references are preserved; falls back to creating fresh layout nodes
 * for boids whose ids aren't present in the prior layout.
 */
const boidsToLayout = (
  boids: readonly FlockBoid[],
  { width, height }: { width: number; height: number },
  prevLayout: GraphLayout<SpaceGraphNode> | undefined,
): GraphLayout<SpaceGraphNode> => {
  const cx = width / 2;
  const cy = height / 2;
  const previousById = new Map((prevLayout?.graph.nodes ?? []).map((n) => [n.id, n] as const));
  const nodes: GraphLayoutNode<SpaceGraphNode>[] = boids
    .filter((b) => b.id !== undefined)
    .map((boid) => {
      const id = boid.id!;
      const prev = previousById.get(id);
      return {
        ...(prev ?? { id }),
        x: boid.position.x - cx,
        y: boid.position.y - cy,
      };
    });
  return {
    graph: {
      nodes,
      // Edges aren't represented in the swarm — keep whatever the previous layout had so
      // the next projector still has a topology to bind to via mergeData.
      edges: prevLayout?.graph.edges ?? [],
    },
  };
};

/** Cross-variant tween duration. Matches the renderer's edge fade timing so node movement and edge enter/exit complete together. */
const TWEEN_MS = 500;

const createProjector = (
  variant: Exclude<ExplorerArticleVariant, 'swarm'>,
  ctx: SVGContext,
  prev?: GraphLayout<SpaceGraphNode>,
): GraphProjector<SpaceGraphNode> => {
  switch (variant) {
    case 'force':
      // Force has no `duration` — its own simulation drives motion via ticks.
      return new GraphForceProjector<SpaceGraphNode>(ctx, undefined, undefined, prev);

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
      return undefined;

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
