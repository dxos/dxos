//
// Copyright 2026 DXOS.org
//

import { select } from 'd3';
import React, { useEffect, useMemo, useRef } from 'react';

import { Obj } from '@dxos/echo';
import { type SpaceGraphNode } from '@dxos/schema';
import { mx } from '@dxos/ui-theme';

import { type TreeLayoutSlots, defaultTreeLayoutSlots } from '../Tree/layout/slots';
import { useContainerSize } from '../Tree/layout/useContainerSize';
import { type TreeNode } from '../Tree/types';

const TRANSITION_MS = 350;

export type LatticeProps = {
  /** Object nodes from the space graph (typically `model.graph.nodes` filtered to `type === 'object'`). */
  nodes: SpaceGraphNode[];
  /** Padding (in screen pixels) reserved around the lattice. */
  padding?: number;
  slots?: TreeLayoutSlots;
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
 * Columns ≈ √N so the grid is as square as possible; cell size is derived from the
 * available width/height so all nodes are always in view. Cells are sorted by typename
 * then by label so objects of the same type cluster together.
 */
export const Lattice = ({ nodes, padding = 16, slots = defaultTreeLayoutSlots, onNodeHover }: LatticeProps) => {
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
      slots,
      onNodeHover: (n, e) => handleHoverRef.current?.(n, e),
    });
  }, [cells, width, height, padding, slots]);

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
  slots: TreeLayoutSlots;
  onNodeHover: (node: TreeNode<Obj.Unknown> | null, event?: MouseEvent) => void;
};

const renderLattice = (svgElement: SVGSVGElement, cells: LatticeCell[], options: RenderOptions) => {
  const { width, height, padding, slots, onNodeHover } = options;
  const svg = select(svgElement);

  if (!cells.length) {
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
  // The circle should sit inside the cell with breathing room for the label below it.
  const r = Math.max(2, Math.min(cellSize * 0.25, 24));

  // Center the lattice in the container.
  const gridW = cellSize * columns;
  const gridH = cellSize * rows;
  const offsetX = (width - gridW) / 2 + cellSize / 2;
  const offsetY = (height - gridH) / 2 + cellSize / 2;

  const g = svg
    .selectAll<SVGGElement, null>('g.dx-lattice-root')
    .data([null])
    .join('g')
    .classed('dx-lattice-root', true);

  const cellsLayer = g
    .selectAll<SVGGElement, null>('g.dx-lattice-cells')
    .data([null])
    .join('g')
    .classed('dx-lattice-cells', true);

  type Positioned = LatticeCell & { x: number; y: number };
  const positioned: Positioned[] = cells.map((cell, i) => ({
    ...cell,
    x: offsetX + (i % columns) * cellSize,
    y: offsetY + Math.floor(i / columns) * cellSize,
  }));

  const node = cellsLayer
    .selectAll<SVGGElement, Positioned>('g.dx-lattice-cell')
    .data(positioned, (d) => d.id)
    .join(
      (enter) => {
        const ge = enter.append('g').classed('dx-lattice-cell', true).attr('opacity', 0);
        ge.append('circle').style('cursor', 'pointer');
        ge.append('text')
          .attr('dy', '0.32em')
          .attr('text-anchor', 'middle')
          .attr('paint-order', 'stroke')
          .style('pointer-events', 'none');
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
    .select<SVGCircleElement>('circle')
    .attr('class', [slots.node ?? '', 'dx-leaf'].filter(Boolean).join(' '))
    .attr('r', r)
    .on('pointerenter', (event: MouseEvent, d: Positioned) =>
      onNodeHover({ id: d.id, label: d.label, data: d.object }, event),
    )
    .on('pointerleave', () => onNodeHover(null));

  node
    .select<SVGTextElement>('text')
    .attr('class', mx(slots.text ?? '', 'select-none'))
    .attr('y', r + 10)
    .text((d) => truncateLabel(d.label, Math.max(4, Math.floor(cellSize / 6))));
};

const truncateLabel = (label: string, max: number): string =>
  label.length > max ? `${label.slice(0, Math.max(1, max - 1))}…` : label;
