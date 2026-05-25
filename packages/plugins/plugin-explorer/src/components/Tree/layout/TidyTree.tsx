//
// Copyright 2023 DXOS.org
// Copyright 2024 Observable, Inc.
//

import { curveBumpX, link as d3Link, select, tree as d3Tree } from 'd3';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { type TreeNode } from '../types';
import { buildHierarchy, isCollapsed, isLeaf } from './hierarchy';
import { type TreeLayoutSlots, defaultTreeLayoutSlots } from './slots';
import { useContainerSize } from './useContainerSize';

const TRANSITION_MS = 350;

export type TidyTreeProps = ThemedClassName<{
  data: TreeNode;
  label?: (d: TreeNode) => string;
  slots?: TreeLayoutSlots;
  /** Node radius. */
  r?: number;
  /** Margin in screen pixels reserved around the layout. */
  margin?: number;
  /** Initial set of collapsed node ids. */
  initialCollapsed?: Iterable<string>;
  /** Notified when the user clicks a node. */
  onNodeClick?: (node: TreeNode) => void;
}>;

/**
 * Tidy (horizontal) tree layout based on the D3 reference component.
 * https://observablehq.com/@d3/tree-component
 *
 * Click a node with children to toggle collapse / expand.
 */
export const TidyTree = ({
  classNames,
  data,
  label = (d) => d.label ?? d.id,
  slots = defaultTreeLayoutSlots,
  r = 4,
  margin = 24,
  initialCollapsed,
  onNodeClick,
}: TidyTreeProps) => {
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

  // Stable click handler ref so the d3 render fn doesn't need to be re-bound.
  const handleClickRef = useRef<(node: TreeNode) => void>(() => {});
  handleClickRef.current = (node: TreeNode) => {
    onNodeClick?.(node);
    if (node.children?.length) {
      toggle(node.id);
    }
  };

  const root = useMemo(() => buildHierarchy(data, collapsed), [data, collapsed]);

  useEffect(() => {
    if (!svgRef.current || !width || !height) {
      return;
    }

    renderTidyTree(svgRef.current, root, {
      width,
      height,
      r,
      margin,
      label,
      slots,
      collapsed,
      onNodeClick: (n) => handleClickRef.current(n),
    });
  }, [root, width, height, r, margin, label, slots, collapsed]);

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
  width: number;
  height: number;
  r: number;
  margin: number;
  label: (d: TreeNode) => string;
  slots: TreeLayoutSlots;
  collapsed: Set<string>;
  onNodeClick: (node: TreeNode) => void;
};

const renderTidyTree = (svgElement: SVGSVGElement, root: any, options: RenderOptions) => {
  const { width, height, r, margin, label, slots, collapsed, onNodeClick } = options;
  const svg = select(svgElement);

  // Compute layout: nodeSize gives a stable, content-driven scale.
  // dx = vertical spacing between siblings; dy = horizontal spacing between depths.
  const dx = 18;
  const dy = Math.max(60, (width - margin * 2) / Math.max(1, root.height + 1));
  d3Tree<TreeNode>().nodeSize([dx, dy])(root);

  // Center the tree vertically; lay it out horizontally from left.
  let x0 = Infinity;
  let x1 = -x0;
  root.each((d: any) => {
    if (d.x > x1) {
      x1 = d.x;
    }
    if (d.x < x0) {
      x0 = d.x;
    }
  });

  const treeWidth = width - margin * 2;
  const treeHeight = x1 - x0;
  const scaleY = treeHeight > 0 ? Math.min(1, (height - margin * 2) / treeHeight) : 1;
  const offsetX = -treeWidth / 2;
  const offsetY = -(x0 + x1) / 2;

  // Root group ensures consistent transforms on re-renders.
  const g = svg.selectAll<SVGGElement, null>('g.dx-tidy-root').data([null]).join('g').classed('dx-tidy-root', true);

  // Links layer.
  const linksLayer = g
    .selectAll<SVGGElement, null>('g.dx-tidy-links')
    .data([null])
    .join('g')
    .classed('dx-tidy-links', true);

  // Nodes layer (rendered above links).
  const nodesLayer = g
    .selectAll<SVGGElement, null>('g.dx-tidy-nodes')
    .data([null])
    .join('g')
    .classed('dx-tidy-nodes', true);

  // Links.
  const linkPath = d3Link<any, any>(curveBumpX)
    .x((d: any) => offsetX + d.y)
    .y((d: any) => (d.x + offsetY) * scaleY);

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

  // Nodes.
  const node = nodesLayer.selectAll<SVGGElement, any>('g.dx-tidy-node').data(root.descendants(), (d: any) => d.data.id);

  const nodeEnter = node
    .enter()
    .append('g')
    .classed('dx-tidy-node', true)
    .attr('transform', (d: any) => `translate(${offsetX + d.y},${(d.x + offsetY) * scaleY})`)
    .attr('opacity', 0)
    .style('cursor', (d: any) => (d.data.children?.length ? 'pointer' : 'default'))
    .on('click', (_, d: any) => onNodeClick(d.data));

  nodeEnter.append('circle').attr('r', r);
  nodeEnter
    .append('text')
    .attr('dy', '0.32em')
    .attr('x', (d: any) => (d.children ? -(r + 4) : r + 4))
    .attr('text-anchor', (d: any) => (d.children ? 'end' : 'start'))
    .text((d: any) => label(d.data));

  const nodeMerge = nodeEnter.merge(node as any);

  nodeMerge
    .transition()
    .duration(TRANSITION_MS)
    .attr('opacity', 1)
    .attr('transform', (d: any) => `translate(${offsetX + d.y},${(d.x + offsetY) * scaleY})`);

  // Circle: filled when collapsed (has hidden children), outlined when expanded or leaf.
  nodeMerge
    .select<SVGCircleElement>('circle')
    .attr('class', (d: any) => {
      const collapsedHere = isCollapsed(d.data, collapsed);
      const leaf = isLeaf(d.data);
      return [slots.node ?? '', collapsedHere ? 'dx-collapsed' : leaf ? 'dx-leaf' : 'dx-branch']
        .filter(Boolean)
        .join(' ');
    })
    .attr('r', r);

  nodeMerge
    .select<SVGTextElement>('text')
    .attr('class', slots.text ?? '')
    .attr('x', (d: any) => (d.children ? -(r + 4) : r + 4))
    .attr('text-anchor', (d: any) => (d.children ? 'end' : 'start'))
    .text((d: any) => label(d.data));

  node
    .exit()
    .each(function () {
      // Cancel any in-flight transitions so .remove() actually fires.
      select(this).interrupt();
    })
    .transition()
    .duration(TRANSITION_MS)
    .attr('opacity', 0)
    .remove();
};

export default TidyTree;
