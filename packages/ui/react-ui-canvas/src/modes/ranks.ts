//
// Copyright 2026 DXOS.org
//

//
// Variant 2 of §3: cardinal constraints between named nodes, solved into grid slots by `@dxos/diagram`'s longest-path
// ranking per axis. Constrained mode places a layout's shapes with it.
//

import { Layout } from '@dxos/diagram';
import { type BuiltinNodeType, type Node, type NodeStyle, type Point, type Size } from '@dxos/scene';

import { type NodeRegistry, type View } from '../model/index.ts';
import { centeredOrigin, createNode, initialKeys, withTitle } from '../utils/index.ts';

/** `subject <relation> object`: "A east of B", "A aligned with B" (same row). */
export type Relation = 'east' | 'west' | 'north' | 'south' | 'aligned';

export type Constraint = { subject: string; relation: Relation; object: string };

/** `type` is the node's shape; the solver places every type on the same grid. */
export type ConstrainedNode = { id: string; label?: string; type?: BuiltinNodeType; style?: NodeStyle };

export type ConstrainedModel = {
  nodes: ConstrainedNode[];
  constraints: Constraint[];
};

export type ConstrainedOptions = {
  /** The node types, for the part each created node's title goes in. */
  nodes: NodeRegistry;
  /** Distance between grid slots. */
  pitch?: Size;
  /** Every node has the same size (§3: equal sizes, snapped to the grid). */
  size?: Size;
  /** The first slot's centre; by default the layout straddles the origin. */
  origin?: Point;
};

/** Multiples of the major grid, so a solved layout is already snapped. */
export const CONSTRAINED_GRID: Required<Omit<ConstrainedOptions, 'origin' | 'nodes'>> = {
  pitch: { width: 256, height: 192 },
  size: { width: 192, height: 128 },
};

export const CONSTRAINED_VIEW_ID = 'constrained';

type Edge = { from: string; to: string };

const reaches = (edges: readonly Edge[], from: string, to: string): boolean => {
  const seen = new Set<string>([from]);
  const queue = [from];
  while (queue.length > 0) {
    const current = queue.shift();
    for (const edge of edges) {
      if (edge.from === current && !seen.has(edge.to)) {
        if (edge.to === to) {
          return true;
        }
        seen.add(edge.to);
        queue.push(edge.to);
      }
    }
  }
  return false;
};

/** Union-find over `aligned` pairs: members of a group share a row. */
const rowGroups = (model: ConstrainedModel): Map<string, string> => {
  const parent = new Map<string, string>(model.nodes.map(({ id }) => [id, id]));
  const find = (id: string): string => {
    const root = parent.get(id) ?? id;
    if (root === id) {
      return id;
    }
    const top = find(root);
    parent.set(id, top);
    return top;
  };
  for (const { subject, relation, object } of model.constraints) {
    if (relation === 'aligned') {
      parent.set(find(subject), find(object));
    }
  }
  return new Map(model.nodes.map(({ id }) => [id, find(id)]));
};

export type Solution = {
  rows: Map<string, number>;
  columns: Map<string, number>;
};

/** Longest-path ranks per axis: `south`/`north` order rows, `east`/`west` order columns within a row. */
export const solveRanks = (model: ConstrainedModel): Solution => {
  const ids = model.nodes.map(({ id }) => id);
  const groups = rowGroups(model);
  const groupIds = [...new Set(groups.values())];

  const rowEdges: Edge[] = [];
  const columnEdges: Edge[] = [];
  for (const { subject, relation, object } of model.constraints) {
    switch (relation) {
      case 'south':
        rowEdges.push({ from: groups.get(object) ?? object, to: groups.get(subject) ?? subject });
        break;
      case 'north':
        rowEdges.push({ from: groups.get(subject) ?? subject, to: groups.get(object) ?? object });
        break;
      case 'east':
        columnEdges.push({ from: object, to: subject });
        break;
      case 'west':
        columnEdges.push({ from: subject, to: object });
        break;
      default:
        break;
    }
  }
  // A constraint that would close a cycle is dropped rather than breaking the solve.
  const acyclic = (edges: Edge[]): Edge[] => {
    const kept: Edge[] = [];
    for (const edge of edges) {
      if (!reaches(kept, edge.to, edge.from)) {
        kept.push(edge);
      }
    }
    return kept;
  };
  const groupRanks = Layout.rank(groupIds, acyclic(rowEdges));
  const rows = new Map(ids.map((id) => [id, groupRanks.get(groups.get(id) ?? id) ?? 0]));

  const columns = new Map<string, number>();
  const byRow = new Map<number, string[]>();
  for (const id of ids) {
    const row = rows.get(id) ?? 0;
    byRow.set(row, [...(byRow.get(row) ?? []), id]);
  }
  for (const members of byRow.values()) {
    const set = new Set(members);
    const edges = acyclic(columnEdges.filter(({ from, to }) => set.has(from) && set.has(to)));
    const ranks = Layout.rank(members, edges);
    // Unconstrained members of a row take the next free column after the constrained ones.
    const used = new Set<number>();
    for (const id of members) {
      if (edges.some(({ from, to }) => from === id || to === id)) {
        const column = ranks.get(id) ?? 0;
        columns.set(id, column);
        used.add(column);
      }
    }
    let free = 0;
    for (const id of members) {
      if (!columns.has(id)) {
        while (used.has(free)) {
          free++;
        }
        columns.set(id, free);
        used.add(free);
      }
    }
  }
  return { rows, columns };
};

/** Solve the model to a positioned scene. */
export const solve = (model: ConstrainedModel, options: ConstrainedOptions): View => {
  const { pitch, size } = { ...CONSTRAINED_GRID, ...options };
  const { rows, columns } = solveRanks(model);
  const extent = {
    columns: Math.max(...columns.values(), 0) + 1,
    rows: Math.max(...rows.values(), 0) + 1,
  };
  const origin = options.origin ?? centeredOrigin(extent, pitch, size);
  const keys = initialKeys(model.nodes.length);
  const nodes: Record<string, Node> = {};
  model.nodes.forEach((node, index) => {
    const center = {
      x: origin.x + (columns.get(node.id) ?? 0) * pitch.width,
      y: origin.y + (rows.get(node.id) ?? 0) * pitch.height,
    };
    const solved = withTitle(
      options.nodes,
      createNode({ type: node.type ?? 'rect', id: node.id, z: keys[index], center, size }),
      node.label ?? node.id,
    );
    nodes[node.id] = node.style ? { ...solved, style: node.style } : solved;
  });
  return { id: CONSTRAINED_VIEW_ID, name: 'Constrained', nodes, links: {} };
};
