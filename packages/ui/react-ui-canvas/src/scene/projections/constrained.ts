//
// Copyright 2026 DXOS.org
//

//
// Constrained projection (§3 variant 2): the model is a set of cardinal constraints between named
// nodes, solved to a grid by longest-path ranking per axis. A `move` intent never writes a
// coordinate: it classifies the drop against the nearest neighbour and rewrites the moved node's
// constraints, then the scene re-solves. Ambiguous drops (no neighbour) are rejected.
//

import * as Atom from 'effect/unstable/reactivity/Atom';
import type * as Registry from 'effect/unstable/reactivity/AtomRegistry';

import { Layout } from '@dxos/diagram';

import { initialKeys } from '../order.ts';
import { type Projection } from '../projection.ts';
import { type Capabilities, type Cell, type Intent, type Point, type Scene, type Size, isPlaced } from '../types.ts';

/** `subject <relation> object`: "A east of B", "A aligned with B" (same row). */
export type Relation = 'east' | 'west' | 'north' | 'south' | 'aligned';

export type Constraint = { subject: string; relation: Relation; object: string };

export type ConstrainedNode = { id: string; label?: string };

export type ConstrainedModel = {
  nodes: ConstrainedNode[];
  constraints: Constraint[];
};

export type ConstrainedOptions = {
  /** Distance between grid slots. */
  pitch?: Size;
  /** Every cell has the same size (§3: equal cell sizes, snapped to the grid). */
  size?: Size;
  origin?: Point;
};

const DEFAULTS: Required<ConstrainedOptions> = {
  pitch: { width: 260, height: 180 },
  size: { width: 180, height: 100 },
  origin: { x: 120, y: 90 },
};

export const CONSTRAINED_SCENE_ID = 'constrained';

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
    if (relation === 'aligned' && parent.has(subject) && parent.has(object)) {
      parent.set(find(subject), find(object));
    }
  }
  return new Map(model.nodes.map(({ id }) => [id, find(id)]));
};

export type Solution = {
  rows: Map<string, number>;
  columns: Map<string, number>;
};

/** Ranks per axis: rows from north/south over aligned groups, columns from east/west with id tie-breaks per row. */
export const solveRanks = (model: ConstrainedModel): Solution => {
  const ids = model.nodes.map(({ id }) => id);
  const known = new Set(ids);
  const groupOf = rowGroups(model);
  const groups = [...new Set(groupOf.values())];

  const rowEdges: Edge[] = [];
  const columnEdges: Edge[] = [];
  for (const { subject, relation, object } of model.constraints) {
    if (!known.has(subject) || !known.has(object)) {
      continue;
    }
    switch (relation) {
      case 'south':
        rowEdges.push({ from: groupOf.get(object) ?? object, to: groupOf.get(subject) ?? subject });
        break;
      case 'north':
        rowEdges.push({ from: groupOf.get(subject) ?? subject, to: groupOf.get(object) ?? object });
        break;
      case 'east':
        columnEdges.push({ from: object, to: subject });
        break;
      case 'west':
        columnEdges.push({ from: subject, to: object });
        break;
      case 'aligned':
        break;
    }
  }

  const groupRank = Layout.rank(groups, rowEdges);
  const rows = new Map(ids.map((id) => [id, groupRank.get(groupOf.get(id) ?? id) ?? 0]));

  // Cells sharing a row with no ordering between them are placed by id, as an edge, so ranking keeps
  // them apart without ever contradicting an explicit constraint.
  const byRow = new Map<number, string[]>();
  for (const id of ids) {
    const row = rows.get(id) ?? 0;
    byRow.set(row, [...(byRow.get(row) ?? []), id]);
  }
  const tieEdges: Edge[] = [];
  for (const members of byRow.values()) {
    const sorted = [...members].sort();
    for (let index = 1; index < sorted.length; index++) {
      const previous = sorted[index - 1];
      const current = sorted[index];
      const explicit = [...columnEdges, ...tieEdges];
      if (!reaches(explicit, previous, current) && !reaches(explicit, current, previous)) {
        tieEdges.push({ from: previous, to: current });
      }
    }
  }
  const columns = Layout.rank(ids, [...columnEdges, ...tieEdges]);
  return { rows, columns };
};

/** Solve the model to a positioned scene. */
export const solve = (model: ConstrainedModel, options: ConstrainedOptions = {}): Scene => {
  const { pitch, size, origin } = { ...DEFAULTS, ...options };
  const { rows, columns } = solveRanks(model);
  const keys = initialKeys(model.nodes.length);
  const cells: Record<string, Cell> = {};
  model.nodes.forEach((node, index) => {
    cells[node.id] = {
      kind: 'rect',
      id: node.id,
      z: keys[index],
      center: {
        x: origin.x + (columns.get(node.id) ?? 0) * pitch.width,
        y: origin.y + (rows.get(node.id) ?? 0) * pitch.height,
      },
      size,
      label: node.label ?? node.id,
    };
  });
  return { id: CONSTRAINED_SCENE_ID, name: 'Constrained', cells };
};

/**
 * Rewrite the constraints of `id` from where it was dropped: the nearest other cell becomes its
 * reference; a mostly horizontal offset makes it east/west of and aligned with that cell, a mostly
 * vertical one north/south of it. Returns the model unchanged when there is no neighbour.
 */
export const rewriteForDrop = (model: ConstrainedModel, scene: Scene, id: string, delta: Point): ConstrainedModel => {
  const moved = scene.cells[id];
  if (!moved || !isPlaced(moved)) {
    return model;
  }
  const target = { x: moved.center.x + delta.x, y: moved.center.y + delta.y };
  let nearest: { id: string; dx: number; dy: number } | undefined;
  let best = Infinity;
  for (const cell of Object.values(scene.cells)) {
    if (cell.id === id || !isPlaced(cell)) {
      continue;
    }
    const dx = target.x - cell.center.x;
    const dy = target.y - cell.center.y;
    const distance = dx * dx + dy * dy;
    if (distance < best) {
      best = distance;
      nearest = { id: cell.id, dx, dy };
    }
  }
  if (!nearest) {
    return model;
  }
  const kept = model.constraints.filter(({ subject, object }) => subject !== id && object !== id);
  const horizontal = Math.abs(nearest.dx) >= Math.abs(nearest.dy);
  const added: Constraint[] = horizontal
    ? [
        { subject: id, relation: nearest.dx > 0 ? 'east' : 'west', object: nearest.id },
        { subject: id, relation: 'aligned', object: nearest.id },
      ]
    : [{ subject: id, relation: nearest.dy > 0 ? 'south' : 'north', object: nearest.id }];
  return { ...model, constraints: [...kept, ...added] };
};

export const constrainedCapabilities: Capabilities = { move: true, create: true, delete: true };

export type ConstrainedProjectionOptions = {
  registry: Registry.AtomRegistry;
  model: Atom.Writable<ConstrainedModel>;
  options?: ConstrainedOptions;
};

export const createConstrainedProjection = ({ registry, model, options }: ConstrainedProjectionOptions): Projection => {
  const scene = Atom.keepAlive(Atom.make((get) => solve(get(model), options)));
  const apply = (intent: Intent) => {
    const current = registry.get(model);
    switch (intent.kind) {
      case 'move': {
        let next = current;
        for (const id of intent.ids) {
          next = rewriteForDrop(next, registry.get(scene), id, intent.delta);
        }
        if (next !== current) {
          registry.set(model, next);
        }
        break;
      }
      case 'create': {
        if (intent.cell.kind !== 'rect') {
          return;
        }
        const node = { id: intent.cell.id, label: intent.cell.label };
        const added = { ...current, nodes: [...current.nodes, node] };
        // Constrain the new node as if it had been dropped where it was drawn.
        const solved = registry.get(scene);
        const provisional: Scene = { ...solved, cells: { ...solved.cells, [node.id]: intent.cell } };
        registry.set(model, rewriteForDrop(added, provisional, node.id, { x: 0, y: 0 }));
        break;
      }
      case 'delete': {
        const ids = new Set(intent.ids);
        registry.set(model, {
          nodes: current.nodes.filter(({ id }) => !ids.has(id)),
          constraints: current.constraints.filter(({ subject, object }) => !ids.has(subject) && !ids.has(object)),
        });
        break;
      }
      default:
        break;
    }
  };
  return { scene, apply, capabilities: constrainedCapabilities };
};
