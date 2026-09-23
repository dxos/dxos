//
// Copyright 2026 DXOS.org
//

//
// Auto layout (MIGRATION.md M4): the scene's own nodes arranged into ranked rows along its links,
// through `@dxos/diagram`'s ranking — the same engine the dynamic projection lays its graph out with,
// rather than a second one. Unlike the editor's `@antv` layout this keeps each node: its type, its
// size and its content are untouched and only the centre moves, so laying out is an arrangement of
// the diagram rather than a replacement of it.
//

import { Layout } from '@dxos/diagram';

import { type ElementId, MAJOR_GRID, type Point, type Scene, type Size, endpointNode } from '../model/types.ts';

export type LayoutOptions = {
  /** Gap between rows and between the columns within a row, in scene px. */
  gap?: Size;
  /** Where the arrangement's top-left corner goes. */
  origin?: Point;
};

const DEFAULTS: Required<LayoutOptions> = {
  gap: { width: MAJOR_GRID * 2, height: MAJOR_GRID * 2 },
  origin: { x: MAJOR_GRID * 2, y: MAJOR_GRID * 2 },
};

/**
 * The scene with its nodes ranked into rows: a node sits one row below its deepest predecessor, and
 * the nodes of a row are laid left to right in their current left-to-right order, so an arrangement a
 * user has already tidied along a row survives. Rows are as tall as their tallest node and columns as
 * wide as their widest, so mixed sizes never overlap. Everything lands on the major grid.
 *
 * `ids`, when given, narrows what moves: the rest of the scene stays exactly where it is, which is how
 * "lay out the selection" differs from "lay out the board".
 */
export const layoutScene = (scene: Scene, ids?: readonly ElementId[], options: LayoutOptions = {}): Scene => {
  const { gap, origin } = { ...DEFAULTS, ...options };
  const subject = new Set(ids ?? Object.keys(scene.nodes));
  const moving = Object.values(scene.nodes).filter((node) => subject.has(node.id) && !node.locked);
  if (moving.length === 0) {
    return scene;
  }

  const known = new Set(moving.map(({ id }) => id));
  const edges = Object.values(scene.links)
    .map((link) => ({ from: endpointNode(link.source) ?? '', to: endpointNode(link.target) ?? '' }))
    .filter(({ from, to }) => known.has(from) && known.has(to));
  // Sorted, so the ranking (and with it the arrangement) does not depend on the map's insertion order.
  const ordered = [...moving].sort((left, right) => (left.id < right.id ? -1 : 1));
  const ranks = Layout.rank(
    ordered.map(({ id }) => id),
    edges,
  );

  const rows = new Map<number, typeof ordered>();
  for (const node of ordered) {
    const rank = ranks.get(node.id) ?? 0;
    rows.set(rank, [...(rows.get(rank) ?? []), node]);
  }

  const centers = new Map<string, Point>();
  let top = origin.y;
  for (const rank of [...rows.keys()].sort((left, right) => left - right)) {
    // Their current order along the row, so a row the user has already arranged keeps its reading order.
    const members = [...(rows.get(rank) ?? [])].sort((left, right) => left.center.x - right.center.x);
    const height = Math.max(...members.map(({ size }) => size.height));
    let left = origin.x;
    for (const node of members) {
      centers.set(node.id, snap({ x: left + node.size.width / 2, y: top + height / 2 }));
      left += node.size.width + gap.width;
    }
    top += height + gap.height;
  }

  const nodes = { ...scene.nodes };
  let changed = false;
  for (const [id, center] of centers) {
    const node = nodes[id];
    if (node.center.x !== center.x || node.center.y !== center.y) {
      nodes[id] = { ...node, center };
      changed = true;
    }
  }
  return changed ? { ...scene, nodes } : scene;
};

const snap = ({ x, y }: Point): Point => ({
  x: Math.round(x / MAJOR_GRID) * MAJOR_GRID,
  y: Math.round(y / MAJOR_GRID) * MAJOR_GRID,
});

export type GridExtent = { columns: number; rows: number };

/**
 * Where the first slot's centre goes for a grid of `extent` equal slots, `size` each and `pitch` apart,
 * placed so the whole arrangement straddles the origin. A slot spans an odd number of major cells, so
 * its run's exact midpoint falls half a cell off the grid; the leading edge is rounded to the grid
 * instead, which keeps every slot snapped at the cost of the arrangement sitting up to half a cell off
 * centre.
 */
export const centeredOrigin = (extent: GridExtent, pitch: Size, size: Size): Point => ({
  x: leadingEdge(extent.columns, pitch.width, size.width) + size.width / 2,
  y: leadingEdge(extent.rows, pitch.height, size.height) + size.height / 2,
});

const leadingEdge = (count: number, pitch: number, extent: number): number =>
  Math.round(-(Math.max(count - 1, 0) * pitch + extent) / 2 / MAJOR_GRID) * MAJOR_GRID;
