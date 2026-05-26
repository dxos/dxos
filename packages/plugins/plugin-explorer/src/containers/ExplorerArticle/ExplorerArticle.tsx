//
// Copyright 2023 DXOS.org
//

import '@dxos/react-ui-graph/styles/graph.css';

import { select } from 'd3';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { type Filter, Obj, type View } from '@dxos/echo';
import { QueryBuilder } from '@dxos/echo-query';
import { useObject } from '@dxos/react-client/echo';
import { DxAnchorActivate, Icon, Panel, Toolbar } from '@dxos/react-ui';
import { QueryEditor, type QueryEditorProps } from '@dxos/react-ui-components';
import {
  CLUSTER_NODE_TYPE_GROUP,
  CLUSTER_NODE_TYPE_LEAF,
  CLUSTER_NODE_TYPE_ROOT,
  GraphBundleProjector,
  GraphClusterProjector,
  GraphForceProjector,
  type GraphLayout,
  type GraphLayoutEdge,
  type GraphLayoutNode,
  GraphLatticeProjector,
  type GraphProjector,
  type RenderNode,
  SVG,
  type SVGContext,
} from '@dxos/react-ui-graph';
import { type SpaceGraphEdge, type SpaceGraphNode } from '@dxos/schema';

import { type TreeNode } from '#components';
import { useGraphModel } from '#hooks';

import { getNodeFillForObject } from '../../util/node-color';

/** Visualization variants exposed by `ExplorerArticle`. */
export type ExplorerArticleVariant = 'force' | 'cluster' | 'bundle' | 'lattice';

const VARIANTS: { value: ExplorerArticleVariant; icon: string; label: string }[] = [
  {
    value: 'force',
    icon: 'ph--graph--regular',
    label: 'Force-directed',
  },
  {
    value: 'cluster',
    icon: 'ph--asterisk-simple--regular',
    label: 'Radial',
  },
  {
    value: 'bundle',
    icon: 'ph--circles-three-plus--regular',
    label: 'Connections',
  },
  {
    value: 'lattice',
    icon: 'ph--grid-four--regular',
    label: 'Lattice',
  },
];

export type ExplorerArticleProps = AppSurface.ObjectArticleProps<View.View>;

export const ExplorerArticle = ({ role, subject, variant }: ExplorerArticleProps) => {
  const [view] = useObject(subject);
  const db = view && Obj.getDatabase(view);
  const [filter, setFilter] = useState<Filter.Any>();
  const model = useGraphModel(db, filter);

  const builder = useMemo(() => new QueryBuilder(), []);
  const handleChange = useCallback<NonNullable<QueryEditorProps['onChange']>>((value) => {
    setFilter(builder.build(value).filter);
  }, []);

  // The `variant` prop is the initial value; user can toggle via the toolbar tabs.
  const [selected, setSelected] = useState<ExplorerArticleVariant>(isVariant(variant) ? variant : 'force');
  useEffect(() => {
    if (isVariant(variant)) {
      setSelected(variant);
    }
  }, [variant]);
  const handleVariantChange = useCallback((value: string) => {
    if (isVariant(value)) {
      setSelected(value);
    }
  }, []);

  const handleHoverPreview = useCallback((node: TreeNode | null, event?: MouseEvent) => {
    if (!node || !event) {
      return;
    }
    const obj = node.data;
    if (!obj || !Obj.isObject(obj)) {
      return;
    }
    const dxn = Obj.getDXN(obj)?.toString();
    if (!dxn) {
      return;
    }
    const target = event.target as HTMLElement;
    target.dispatchEvent(
      new DxAnchorActivate({
        dxn,
        label: Obj.getLabel(obj) ?? dxn,
        trigger: target,
        kind: 'card',
      }),
    );
  }, []);

  const showToolbar = role === 'article';

  if (!db || !model) {
    return null;
  }

  return (
    <Panel.Root role={role}>
      {showToolbar && (
        <Panel.Toolbar asChild>
          <Toolbar.Root>
            <QueryEditor db={db} onChange={handleChange} />
            <Toolbar.ToggleGroup type='single' value={selected} onValueChange={handleVariantChange}>
              {VARIANTS.map(({ value, icon, label }) => (
                <Toolbar.ToggleGroupItem key={value} value={value} aria-label={label} title={label}>
                  <Icon icon={icon} size={4} />
                </Toolbar.ToggleGroupItem>
              ))}
            </Toolbar.ToggleGroup>
          </Toolbar.Root>
        </Panel.Toolbar>
      )}
      <Panel.Content>
        <Visualization variant={selected} model={model} onNodeHover={handleHoverPreview} />
      </Panel.Content>
    </Panel.Root>
  );
};

const isVariant = (value: unknown): value is ExplorerArticleVariant =>
  value === 'force' || value === 'cluster' || value === 'bundle' || value === 'lattice';

type VisualizationProps = {
  variant: ExplorerArticleVariant;
  model: NonNullable<ReturnType<typeof useGraphModel>>;
  onNodeHover?: (node: TreeNode | null, event?: MouseEvent) => void;
};

/**
 * One persistent `<SVG.Graph>` mount for all four variants. When the variant
 * changes, a new projector is instantiated and seeded with the previous
 * projector's layout so node x/y survive the swap — the new projector's
 * `animate()` then tweens each node from its current position to the new
 * target, and per-frame edge generators (cluster, bundle) keep curves glued
 * to the moving endpoints.
 */
const Visualization = ({ variant, model, onNodeHover }: VisualizationProps) => {
  const svgRef = useRef<SVGContext>(null);
  const [projector, setProjector] = useState<GraphProjector<SpaceGraphNode> | undefined>();
  const projectorRef = useRef<GraphProjector<SpaceGraphNode> | undefined>(undefined);
  projectorRef.current = projector;

  // Recreate the projector when the variant changes. Pass the previous projector's
  // layout to the constructor so existing node x/y persist across the swap, then
  // the new projector's animate() tweens to its target positions.
  useEffect(() => {
    if (!svgRef.current) {
      return;
    }
    const prev = projectorRef.current?.layout as GraphLayout<SpaceGraphNode> | undefined;
    setProjector(createProjector(variant, svgRef.current, prev));
  }, [variant]);

  const renderNode = useMemo(() => createRenderNode(variant), [variant]);

  const handleInspect = useCallback(
    (node: GraphLayoutNode<SpaceGraphNode> | null, event: MouseEvent) => {
      // Popover preview — null = pointerleave.
      if (!node) {
        onNodeHover?.(null);
      } else {
        onNodeHover?.({ id: node.id, data: node.data?.data?.object }, event);
      }

      // Edge highlight for bundle layout: colour connected edges, dim the rest.
      const svgEl = svgRef.current?.svg;
      if (!svgEl || variant !== 'bundle') {
        return;
      }
      const edgeSel = select(svgEl).selectAll<SVGGElement, GraphLayoutEdge<SpaceGraphNode>>('g.dx-edge');
      edgeSel.style('opacity', (edge) => {
        if (!node) return null;
        const isConnected = edge.source.id === node.id || edge.target.id === node.id;
        return isConnected ? null : '0.08';
      });
      edgeSel
        .select<SVGPathElement>('path')
        .style('stroke', (edge) => {
          if (!node) return null;
          if (edge.source.id === node.id) return 'var(--color-orange-500)';
          if (edge.target.id === node.id) return 'var(--color-sky-500)';
          return null;
        })
        .style('stroke-width', (edge) => {
          if (!node) return null;
          const isConnected = edge.source.id === node.id || edge.target.id === node.id;
          return isConnected ? '1.5px' : null;
        });
    },
    [onNodeHover, variant],
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

  // Force needs SVG.Zoom (drag interaction). Cluster/lattice don't, AND including the zoom
  // wrapper makes their curve edges render incorrectly in some contexts (see iteration
  // history in graph-cluster-projector.ts). So mount with vs. without zoom conditionally.
  const inner = (
    <SVG.Graph<SpaceGraphNode, SpaceGraphEdge>
      model={model}
      projector={projector}
      renderNode={renderNode}
      drag={variant === 'force'}
      onInspect={handleInspect}
      onSelect={handleSelect}
    />
  );
  return (
    <SVG.Root ref={svgRef}>{variant === 'force' ? <SVG.Zoom extent={[1 / 2, 2]}>{inner}</SVG.Zoom> : inner}</SVG.Root>
  );
};

/** Cross-variant tween duration. Matches the renderer's edge fade timing so node
 * movement and edge enter/exit complete together. */
const TWEEN_MS = 500;

const createProjector = (
  variant: ExplorerArticleVariant,
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
        const size = r * 2;
        group
          .append('rect')
          .attr('x', -r)
          .attr('y', -r)
          .attr('width', size)
          .attr('height', size)
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
      // Every node here is a leaf — same circle + radial label shape as cluster.
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
 *
 * Label appears with opacity 0 and fades in after a `TWEEN_MS` delay so the text isn't
 * sliding across the screen mid-tween — leaves first, labels after.
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
  // Flip text 180° on the left half of the layout so it still reads left-to-right.
  const flipped = angleDeg > 90 || angleDeg < -90;
  group
    .append('text')
    .classed('dx-cluster-label', true)
    .attr('dy', '0.32em')
    .attr('transform', `rotate(${flipped ? angleDeg + 180 : angleDeg})`)
    .attr('x', flipped ? -(r + 4) : r + 4)
    .attr('text-anchor', flipped ? 'end' : 'start')
    .attr('opacity', 0)
    .style('pointer-events', 'none')
    .text(label)
    .transition()
    .delay(TWEEN_MS)
    .duration(LABEL_FADE_MS)
    .attr('opacity', 1);
};

/**
 * Append a radial label INSIDE the ring (toward origin) for a synthetic group node.
 * Same rotation/flip rules as the leaf label, but offset and anchor inverted so the
 * text reads from the group circle back toward the center rather than outward.
 */
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
    // Inverse of the leaf offset / anchor — push the text inward, toward the origin.
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

/**
 * Append a centered label below the root node. Root sits at origin where there's no
 * meaningful radial direction; render the label as a plain horizontal caption with
 * the standard halo style.
 */
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
