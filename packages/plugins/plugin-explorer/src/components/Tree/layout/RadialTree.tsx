//
// Copyright 2023 DXOS.org
// Copyright 2024 Observable, Inc.
//

import { cluster as d3Cluster, tree as d3Tree, linkRadial, select } from 'd3';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { type Obj } from '@dxos/echo';
import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { getNodeFillForObject } from '../../../util';
import { type TreeNode } from '../types';
import { buildHierarchy, isCollapsed, isLeaf } from './hierarchy';
import { type TreeLayoutSlots, defaultTreeLayoutSlots } from './slots';
import { useContainerSize } from './useContainerSize';

const TRANSITION_MS = 350;

export type RadialTreeProps = ThemedClassName<{
  data: TreeNode;
  label?: (d: TreeNode) => string;
  slots?: TreeLayoutSlots;
  /** Node radius. */
  r?: number;
  /** Optional padding (in screen pixels) reserved around the radial layout. */
  padding?: number;
  /** Initial set of collapsed node ids. */
  initialCollapsed?: Iterable<string>;
  /**
   * Use `d3.cluster` (all leaves equidistant from center) instead of `d3.tree`.
   * Matches https://observablehq.com/@d3/radial-cluster.
   */
  cluster?: boolean;
  /** Notified when the user clicks a node. */
  onNodeClick?: (node: TreeNode) => void;
  /**
   * Notified on pointerenter (and `null` on pointerleave) for nodes. Used to wire previews
   * (dispatch `DxAnchorActivate`). The event target on enter is the hovered circle — dispatch
   * from it so the preview anchors there.
   */
  onNodeHover?: (node: TreeNode | null, event?: MouseEvent) => void;
}>;

/**
 * Radial tree layout based on the D3 reference component.
 * https://observablehq.com/@d3/radial-tree-component
 *
 * Click a node with children to toggle collapse / expand.
 */
export const RadialTree = ({
  classNames,
  data,
  label = (d) => d.label ?? d.id,
  slots = defaultTreeLayoutSlots,
  r = 4,
  padding = 80,
  initialCollapsed,
  cluster = false,
  onNodeClick,
  onNodeHover,
}: RadialTreeProps) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const { setRef, width, height } = useContainerSize();

  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set(initialCollapsed ?? []));
  const toggle = useCallback((id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleClickRef = useRef<(node: TreeNode) => void>(() => {});
  handleClickRef.current = (node: TreeNode) => {
    onNodeClick?.(node);
    if (node.children?.length) {
      toggle(node.id);
    }
  };

  const handleHoverRef = useRef<(node: TreeNode | null, event?: MouseEvent) => void>(() => {});
  handleHoverRef.current = (node: TreeNode | null, event?: MouseEvent) => onNodeHover?.(node, event);

  const root = useMemo(() => buildHierarchy(data, collapsed), [data, collapsed]);

  useEffect(() => {
    if (!svgRef.current || !width || !height) {
      return;
    }

    const radius = Math.max(0, Math.min(width, height) / 2 - padding);
    renderRadialTree(svgRef.current, root, {
      radius,
      r,
      label,
      slots,
      collapsed,
      cluster,
      onNodeClick: (n) => handleClickRef.current(n),
      onNodeHover: (n, e) => handleHoverRef.current(n, e),
    });
  }, [root, width, height, r, padding, label, slots, collapsed, cluster]);

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

type RenderOptions = {
  radius: number;
  r: number;
  label: (d: TreeNode) => string;
  slots: TreeLayoutSlots;
  collapsed: Set<string>;
  cluster: boolean;
  onNodeClick: (node: TreeNode) => void;
  onNodeHover: (node: TreeNode | null, event?: MouseEvent) => void;
};

const renderRadialTree = (svgElement: SVGSVGElement, root: any, options: RenderOptions) => {
  const { radius, r, label, slots, collapsed, cluster, onNodeClick, onNodeHover } = options;
  const svg = select(svgElement);

  const layout = cluster ? d3Cluster<TreeNode>() : d3Tree<TreeNode>();
  layout
    .size([2 * Math.PI, radius])
    .separation((a: any, b: any) => (a.parent === b.parent ? 1 : 2) / Math.max(1, a.depth))(root);

  const g = svg.selectAll<SVGGElement, null>('g.dx-radial-root').data([null]).join('g').classed('dx-radial-root', true);

  const linksLayer = g
    .selectAll<SVGGElement, null>('g.dx-radial-links')
    .data([null])
    .join('g')
    .classed('dx-radial-links', true);

  const nodesLayer = g
    .selectAll<SVGGElement, null>('g.dx-radial-nodes')
    .data([null])
    .join('g')
    .classed('dx-radial-nodes', true);

  const linkPath = linkRadial<any, any>()
    .angle((d: any) => d.x)
    .radius((d: any) => d.y);

  linksLayer
    .selectAll<SVGPathElement, any>('path')
    .data(root.links(), (d: any) => `${d.source.data.id}->${d.target.data.id}`)
    .join(
      (enter) =>
        enter
          .append('path')
          .attr('class', slots.path ?? '')
          .attr('fill', 'none')
          .attr('opacity', 0),
      (update) => update,
      (exit) => exit.transition().duration(TRANSITION_MS).attr('opacity', 0).remove(),
    )
    .transition()
    .duration(TRANSITION_MS)
    .attr('opacity', 1)
    .attr('d', linkPath);

  const node = nodesLayer
    .selectAll<SVGGElement, any>('g.dx-radial-node')
    .data(root.descendants(), (d: any) => d.data.id);

  const nodeEnter = node
    .enter()
    .append('g')
    .classed('dx-radial-node', true)
    .attr('opacity', 0)
    .attr('transform', (d: any) => `rotate(${(d.x * 180) / Math.PI - 90}) translate(${d.y},0)`)
    .style('cursor', (d: any) => (d.data.children?.length ? 'pointer' : 'default'))
    .on('click', (_, d: any) => onNodeClick(d.data));

  nodeEnter
    .append('circle')
    .attr('r', r)
    .on('pointerenter', (event: MouseEvent, d: any) => onNodeHover(d.data, event))
    .on('pointerleave', (event: MouseEvent) => onNodeHover(null, event));

  nodeEnter
    .append('text')
    .attr('dy', '0.32em')
    .attr('paint-order', 'stroke')
    .text((d: any) => label(d.data));

  const nodeMerge = nodeEnter.merge(node as any);

  nodeMerge
    .transition()
    .duration(TRANSITION_MS)
    .attr('opacity', 1)
    .attr('transform', (d: any) => `rotate(${(d.x * 180) / Math.PI - 90}) translate(${d.y},0)`);

  nodeMerge
    .select<SVGCircleElement>('circle')
    .attr('class', (d: any) => {
      const collapsedHere = isCollapsed(d.data, collapsed);
      const leaf = isLeaf(d.data);
      return [slots.node ?? '', collapsedHere ? 'dx-collapsed' : leaf ? 'dx-leaf' : 'dx-branch']
        .filter(Boolean)
        .join(' ');
    })
    .attr('r', r)
    // Color leaves by typename so cluster matches the force / bundle / lattice variants.
    // Branch nodes (groups, root) keep the default slot fill.
    .style('fill', (d: any) => (isLeaf(d.data) ? getNodeFillForObject(d.data.data as Obj.Unknown | undefined) : null));

  nodeMerge
    .select<SVGTextElement>('text')
    .attr('class', slots.text ?? '')
    .attr('transform', (d: any) => (d.x >= Math.PI ? 'rotate(180)' : null))
    // eslint-disable-next-line no-mixed-operators
    .attr('x', (d: any) => (d.x < Math.PI === !d.children ? r + 4 : -(r + 4)))
    // eslint-disable-next-line no-mixed-operators
    .attr('text-anchor', (d: any) => (d.x < Math.PI === !d.children ? 'start' : 'end'))
    .text((d: any) => label(d.data));

  node.exit().transition().duration(TRANSITION_MS).attr('opacity', 0).remove();
};

export default RadialTree;
