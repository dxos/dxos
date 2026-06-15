//
// Copyright 2026 DXOS.org
//

import { select } from 'd3';
import React, { useEffect, useMemo, useRef } from 'react';

import { Obj } from '@dxos/echo';
import { type SpaceGraphNode } from '@dxos/schema';

import { getNodeFillForObject } from '../../util/node-color';
import { useContainerSize } from '../Tree/layout/useContainerSize';
import { type TreeNode } from '../Tree/types';

const TRANSITION_MS = 350;

export type LatticeProps = {
  /** Object nodes from the space graph (typically `model.graph.nodes` filtered to `type === 'object'`). */
  nodes: SpaceGraphNode[];
  /** Padding (in screen pixels) reserved around the lattice. */
  padding?: number;
  /** Mirrors the hover preview contract used by the other variants. */
  onNodeHover?: (node: TreeNode<Obj.Unknown> | null, event?: MouseEvent) => void;
};

type LatticeCell = {
  id: string;
  label: string;
  typename: string;
  object: Obj.Unknown;
};

/**
 * Renders objects as an SVG lattice that fits the container without scrolling.
 * Each object is a rounded rect, colored by typename via the shared hue-hash used by every
 * other variant. Cells are sorted by typename then label so objects of the same type cluster.
 * Hover dispatches the standard preview event — there is no rendered label.
 */
export const Lattice = ({ nodes, padding = 16, onNodeHover }: LatticeProps) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const { setRef, width, height } = useContainerSize();

  const cells = useMemo<LatticeCell[]>(() => {
    return nodes
      .map((node): LatticeCell | undefined => {
        const object = node.data?.object;
        if (!object) {
          return undefined;
        }
        const label = node.data?.label ?? Obj.getLabel(object) ?? node.id;
        const typename = Obj.getTypename(object) ?? '(untyped)';
        return { id: node.id, label, typename, object };
      })
      .filter((cell): cell is LatticeCell => cell !== undefined)
      .sort((a, b) => a.typename.localeCompare(b.typename) || a.label.localeCompare(b.label));
  }, [nodes]);

  // Stable hover ref so the effect doesn't rebind handlers on every render.
  const handleHoverRef = useRef<LatticeProps['onNodeHover']>(undefined);
  handleHoverRef.current = onNodeHover;

  useEffect(() => {
    if (!svgRef.current || !width || !height) {
      return;
    }
    renderLattice(svgRef.current, cells, {
      width,
      height,
      padding,
      onNodeHover: (n, e) => handleHoverRef.current?.(n, e),
    });
    // Clear any pinned preview when the lattice unmounts or re-renders, so the
    // shared hover target doesn't keep pointing at a cell that no longer exists.
    return () => {
      handleHoverRef.current?.(null);
    };
  }, [cells, width, height, padding]);

  return (
    <div ref={setRef} className='dx-expander relative'>
      {width > 0 && height > 0 && (
        <svg
          ref={svgRef}
          xmlns='http://www.w3.org/2000/svg'
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
        />
      )}
    </div>
  );
};

type RenderOptions = {
  width: number;
  height: number;
  padding: number;
  onNodeHover: (node: TreeNode<Obj.Unknown> | null, event?: MouseEvent) => void;
};

const renderLattice = (svgElement: SVGSVGElement, cells: LatticeCell[], options: RenderOptions) => {
  const { width, height, padding, onNodeHover } = options;
  const svg = select(svgElement);

  if (!cells.length) {
    onNodeHover(null);
    svg.selectAll('g.dx-lattice-root').remove();
    return;
  }

  // Columns ≈ √N so the grid stays as square as possible.
  const count = cells.length;
  const columns = Math.max(1, Math.ceil(Math.sqrt(count)));
  const rows = Math.ceil(count / columns);

  // Derive a cell size that fits both axes after reserving padding around the whole lattice.
  const innerW = Math.max(0, width - 2 * padding);
  const innerH = Math.max(0, height - 2 * padding);
  const cellSize = Math.max(0, Math.min(innerW / columns, innerH / rows));
  // Leave a little gutter between cells; the rect occupies the inner area.
  const gutter = Math.max(2, cellSize * 0.12);
  const rectSize = Math.max(0, cellSize - gutter);
  const radius = Math.max(2, rectSize * 0.18);

  // Center the lattice in the container.
  const gridW = cellSize * columns;
  const gridH = cellSize * rows;
  const offsetX = (width - gridW) / 2;
  const offsetY = (height - gridH) / 2;

  const g = svg
    .selectAll<SVGGElement, null>('g.dx-lattice-root')
    .data([null])
    .join('g')
    .classed('dx-lattice-root', true);

  type Positioned = LatticeCell & { x: number; y: number };
  const positioned: Positioned[] = cells.map((cell, i) => ({
    ...cell,
    x: offsetX + (i % columns) * cellSize + gutter / 2,
    y: offsetY + Math.floor(i / columns) * cellSize + gutter / 2,
  }));

  const node = g
    .selectAll<SVGGElement, Positioned>('g.dx-lattice-cell')
    .data(positioned, (d) => d.id)
    .join(
      (enter) => {
        const ge = enter.append('g').classed('dx-lattice-cell', true).attr('opacity', 0);
        ge.append('rect').style('cursor', 'pointer');
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

  node
    .transition()
    .duration(TRANSITION_MS)
    .attr('opacity', 1)
    .attr('transform', (d) => `translate(${d.x},${d.y})`);

  node
    .select<SVGRectElement>('rect')
    .attr('width', rectSize)
    .attr('height', rectSize)
    .attr('rx', radius)
    .attr('ry', radius)
    .style('fill', (d) => getNodeFillForObject(d.object))
    .on('pointerenter', (event: MouseEvent, d: Positioned) =>
      onNodeHover({ id: d.id, label: d.label, data: d.object }, event),
    )
    .on('pointerleave', () => onNodeHover(null));
};
