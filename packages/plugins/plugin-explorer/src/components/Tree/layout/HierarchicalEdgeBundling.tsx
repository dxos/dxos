//
// Copyright 2023 DXOS.org
// Copyright 2024 Observable, Inc.
//

import { cluster, curveBundle, hierarchy, lineRadial, select } from 'd3';
import type { HierarchyNode } from 'd3-hierarchy';
import React, { useEffect, useMemo, useRef } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { type TreeNode } from '../types';
import { type TreeLayoutSlots, defaultTreeLayoutSlots } from './slots';
import { useContainerSize } from './useContainerSize';

const TRANSITION_MS = 350;

/** A directed edge between two leaves of the hierarchy, identified by node id. */
export type BundleEdge = {
  source: string;
  target: string;
  kind?: string;
};

export type HierarchicalEdgeBundlingProps = ThemedClassName<{
  /** Hierarchical data; leaves are the connectable entities. */
  data: TreeNode;
  /** Edges between leaves (by id). Bundled through the hierarchy. */
  edges?: BundleEdge[];
  /** Label accessor for leaf nodes. */
  label?: (d: TreeNode) => string;
  /** Padding (in screen pixels) reserved around the radial layout. */
  padding?: number;
  /** Bundling tension; 0 = straight, 1 = maximally bundled. */
  tension?: number;
  slots?: TreeLayoutSlots;
  /**
   * Called when the user hovers a leaf node (with the event so callers can dispatch
   * `DxAnchorActivate` for previews). Receives `null` on leave.
   */
  onNodeHover?: (node: TreeNode | null, event?: MouseEvent) => void;
}>;

/**
 * Hierarchical edge bundling.
 * https://observablehq.com/@d3/hierarchical-edge-bundling?intent=fork
 *
 * Leaves are placed on a circle, grouped by their parent in the hierarchy.
 * Edges between leaves are drawn as bundled curves that route through their lowest common ancestor.
 */
export const HierarchicalEdgeBundling = ({
  classNames,
  data,
  edges = [],
  label = (d) => d.label ?? d.id,
  padding = 120,
  tension = 0.85,
  slots = defaultTreeLayoutSlots,
  onNodeHover,
}: HierarchicalEdgeBundlingProps) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const { setRef, width, height } = useContainerSize();

  const root = useMemo(() => buildBundleHierarchy(data, edges), [data, edges]);

  // Stable hover ref so the effect doesn't rebind handlers on every render.
  const handleHoverRef = useRef<(node: TreeNode | null, event?: MouseEvent) => void>(() => {});
  handleHoverRef.current = (node, event) => onNodeHover?.(node, event);

  useEffect(() => {
    if (!svgRef.current || !width || !height) {
      return;
    }

    const radius = Math.max(0, Math.min(width, height) / 2 - padding);
    renderBundling(svgRef.current, root, {
      radius,
      label,
      slots,
      tension,
      onNodeHover: (n, e) => handleHoverRef.current(n, e),
    });
  }, [root, width, height, padding, tension, label, slots]);

  return (
    <div ref={setRef} className={mx('dx-expander relative', classNames)}>
      {width > 0 && height > 0 && (
        <svg
          ref={svgRef}
          xmlns='http://www.w3.org/2000/svg'
          width={width}
          height={height}
          viewBox={`${-width / 2} ${-height / 2} ${width} ${height}`}
        />
      )}
    </div>
  );
};

type BundleHierarchy = HierarchyNode<TreeNode> & {
  outgoing?: Array<[BundleHierarchy, BundleHierarchy, BundleEdge]>;
  incoming?: Array<[BundleHierarchy, BundleHierarchy, BundleEdge]>;
  pathEl?: SVGPathElement | null;
  text?: SVGTextElement | null;
};

/**
 * Build the bundling hierarchy from data + edges.
 * Edges connect leaves (by id); the cluster layout places leaves on the circle.
 */
const buildBundleHierarchy = (data: TreeNode, edges: BundleEdge[]): BundleHierarchy => {
  const root = hierarchy<TreeNode>(data) as BundleHierarchy;
  const byId = new Map<string, BundleHierarchy>();
  for (const node of root.descendants() as BundleHierarchy[]) {
    byId.set(node.data.id, node);
    node.outgoing = [];
    node.incoming = [];
  }

  for (const edge of edges) {
    const source = byId.get(edge.source);
    const target = byId.get(edge.target);
    if (!source || !target || source === target) {
      continue;
    }
    source.outgoing!.push([source, target, edge]);
    target.incoming!.push([source, target, edge]);
  }

  return root;
};

type RenderOptions = {
  radius: number;
  tension: number;
  label: (d: TreeNode) => string;
  slots: TreeLayoutSlots;
  onNodeHover: (node: TreeNode | null, event?: MouseEvent) => void;
};

const renderBundling = (svgElement: SVGSVGElement, root: BundleHierarchy, options: RenderOptions) => {
  const { radius, tension, label, slots, onNodeHover } = options;

  // Degenerate root (no descendants yet): treat as a no-op rather than emit a single "leaf" for the root itself.
  if (!root.children?.length) {
    return;
  }

  cluster<TreeNode>().size([2 * Math.PI, radius])(root);

  const svg = select(svgElement);
  const g = svg.selectAll<SVGGElement, null>('g.dx-bundle-root').data([null]).join('g').classed('dx-bundle-root', true);

  const linksLayer = g
    .selectAll<SVGGElement, null>('g.dx-bundle-links')
    .data([null])
    .join('g')
    .classed('dx-bundle-links', true);

  const nodesLayer = g
    .selectAll<SVGGElement, null>('g.dx-bundle-nodes')
    .data([null])
    .join('g')
    .classed('dx-bundle-nodes', true);

  const line = lineRadial<any>()
    .curve(curveBundle.beta(tension))
    .radius((d: any) => d.y)
    .angle((d: any) => d.x);

  // Each edge: route through the lowest common ancestor via hierarchy.path().
  const leaves = root.leaves() as BundleHierarchy[];
  const flatEdges = leaves.flatMap((leaf) => leaf.outgoing ?? []);

  const paths = linksLayer
    .selectAll<SVGPathElement, any>('path')
    .data(flatEdges, (d: any) => `${d[0].data.id}->${d[1].data.id}`)
    .join(
      (enter) =>
        enter
          .append('path')
          .attr('class', slots.path ?? '')
          .attr('fill', 'none')
          .attr('opacity', 0),
      (update) => update,
      (exit) =>
        exit
          .each(function () {
            select(this).interrupt();
          })
          .transition()
          .duration(TRANSITION_MS)
          .attr('opacity', 0)
          .remove(),
    );

  paths
    .each(function (d: any) {
      d[0].pathEl = this;
    })
    .transition()
    .duration(TRANSITION_MS)
    .attr('opacity', 1)
    .attr('d', ([s, t]) => line(s.path(t)));

  // Render leaf labels along the perimeter.
  const labels = nodesLayer
    .selectAll<SVGGElement, any>('g.dx-bundle-leaf')
    .data(leaves, (d: any) => d.data.id)
    .join(
      (enter) => {
        const ge = enter.append('g').classed('dx-bundle-leaf', true).attr('opacity', 0);
        ge.append('text').attr('dy', '0.32em').attr('paint-order', 'stroke').style('cursor', 'pointer');
        return ge;
      },
      (update) => update,
      (exit) =>
        exit
          .each(function () {
            select(this).interrupt();
          })
          .transition()
          .duration(TRANSITION_MS)
          .attr('opacity', 0)
          .remove(),
    );

  labels
    .transition()
    .duration(TRANSITION_MS)
    .attr('opacity', 1)
    .attr('transform', (d: any) => `rotate(${(d.x * 180) / Math.PI - 90}) translate(${d.y},0)`);

  labels
    .select<SVGTextElement>('text')
    .attr('class', slots.text ?? '')
    .attr('x', (d: any) => (d.x < Math.PI ? 6 : -6))
    .attr('text-anchor', (d: any) => (d.x < Math.PI ? 'start' : 'end'))
    .attr('transform', (d: any) => (d.x >= Math.PI ? 'rotate(180)' : null))
    .each(function (d: BundleHierarchy) {
      d.text = this;
    })
    .text((d: any) => label(d.data))
    .on('pointerenter', function (event: MouseEvent, d: BundleHierarchy) {
      onNodeHover(d.data, event);
      hover(linksLayer, leaves, d, true);
    })
    .on('pointerleave', function (event: MouseEvent, d: BundleHierarchy) {
      onNodeHover(null);
      hover(linksLayer, leaves, d, false);
    });
};

const hover = (linksLayer: any, leaves: BundleHierarchy[], focused: BundleHierarchy, on: boolean) => {
  const outgoing = new Set((focused.outgoing ?? []).map(([, t]) => t));
  const incoming = new Set((focused.incoming ?? []).map(([s]) => s));

  (linksLayer.selectAll('path') as any)
    .classed('dx-bundle-out', (d: any) => on && d[0] === focused)
    .classed('dx-bundle-in', (d: any) => on && d[1] === focused)
    .classed('dx-bundle-dim', (d: any) => on && d[0] !== focused && d[1] !== focused);

  for (const leaf of leaves) {
    if (!leaf.text) {
      continue;
    }
    select(leaf.text)
      .classed('dx-bundle-focused', on && leaf === focused)
      .classed('dx-bundle-out-text', on && outgoing.has(leaf))
      .classed('dx-bundle-in-text', on && incoming.has(leaf));
  }
};

export default HierarchicalEdgeBundling;
