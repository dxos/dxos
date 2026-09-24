//
// Copyright 2026 DXOS.org
//

//
// Variant 2 of §3: the model is a set of cardinal constraints between named nodes; the projection
// solves them into a positioned scene and a `move` intent rewrites the moved node's constraints
// against its nearest neighbour, then re-solves. Uses `@dxos/diagram`'s longest-path ranking per axis.
//

import * as Atom from 'effect/unstable/reactivity/Atom';
import type * as Registry from 'effect/unstable/reactivity/AtomRegistry';

import { Layout } from '@dxos/diagram';

import { centeredOrigin } from '../../utils/layout.ts';
import { initialKeys } from '../../utils/order.ts';
import { createNode, withLabel } from '../../utils/shapes.ts';
import { type Projection } from '../projection.ts';
import {
  type BuiltinNodeType,
  type Capabilities,
  type Intent,
  type Node,
  type Point,
  type Scene,
  type Size,
  isBuiltinNode,
  isPortalNode,
} from '../types.ts';

/** `subject <relation> object`: "A east of B", "A aligned with B" (same row). */
export type Relation = 'east' | 'west' | 'north' | 'south' | 'aligned';

export type Constraint = { subject: string; relation: Relation; object: string };

/** `type` is the node's shape; the solver places every type on the same grid. */
export type ConstrainedNode = { id: string; label?: string; type?: BuiltinNodeType };

export type ConstrainedModel = {
  nodes: ConstrainedNode[];
  constraints: Constraint[];
};

export type ConstrainedOptions = {
  /** Distance between grid slots. */
  pitch?: Size;
  /** Every node has the same size (§3: equal sizes, snapped to the grid). */
  size?: Size;
  /** The first slot's centre; by default the layout straddles the origin. */
  origin?: Point;
};

/** Multiples of the major grid, so a solved layout is already snapped. */
const DEFAULTS: Required<Omit<ConstrainedOptions, 'origin'>> = {
  pitch: { width: 256, height: 192 },
  size: { width: 192, height: 128 },
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
export const solve = (model: ConstrainedModel, options: ConstrainedOptions = {}): Scene => {
  const { pitch, size } = { ...DEFAULTS, ...options };
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
    nodes[node.id] = withLabel(
      createNode({ type: node.type ?? 'rect', id: node.id, z: keys[index], center, size }),
      node.label ?? node.id,
    );
  });
  return { id: CONSTRAINED_SCENE_ID, name: 'Constrained', nodes, links: {} };
};

/**
 * Rewrite the constraints of `id` from where it was dropped: the nearest other node becomes its
 * reference; a mostly horizontal offset makes it east/west of and aligned with that node, a mostly
 * vertical one north/south of it. Returns the model unchanged when there is no neighbour.
 */
export const rewriteForDrop = (model: ConstrainedModel, scene: Scene, id: string, delta: Point): ConstrainedModel => {
  const moved = scene.nodes[id];
  if (!moved) {
    return model;
  }
  const target = { x: moved.center.x + delta.x, y: moved.center.y + delta.y };
  let nearest: { id: string; dx: number; dy: number } | undefined;
  let best = Infinity;
  for (const node of Object.values(scene.nodes)) {
    if (node.id === id) {
      continue;
    }
    const dx = target.x - node.center.x;
    const dy = target.y - node.center.y;
    const distance = dx * dx + dy * dy;
    if (distance < best) {
      best = distance;
      nearest = { id: node.id, dx, dy };
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

/** The display text of a node or a partial update, whichever field its type uses. */
export const labelOf = (values: object): string | undefined => {
  if ('label' in values && typeof values.label === 'string') {
    return values.label;
  }
  if ('name' in values && typeof values.name === 'string') {
    return values.name;
  }
  if ('text' in values && typeof values.text === 'string') {
    return values.text;
  }
  return undefined;
};

const isConstrainedModel = (value: unknown): value is ConstrainedModel =>
  typeof value === 'object' && value !== null && 'nodes' in value && 'constraints' in value;

export const constrainedCapabilities: Capabilities = { move: true, create: true, delete: true, update: true };

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
        // The model records built-in types only; a portal or a host type has no place in it and is refused.
        if (!isBuiltinNode(intent.node) || isPortalNode(intent.node)) {
          return;
        }
        const node: ConstrainedNode = {
          id: intent.node.id,
          type: intent.node.type,
          label: labelOf(intent.node),
        };
        const added = { ...current, nodes: [...current.nodes, node] };
        // Constrain the new node as if it had been dropped where it was drawn.
        const solved = registry.get(scene);
        const provisional: Scene = { ...solved, nodes: { ...solved.nodes, [node.id]: intent.node } };
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
      case 'batch':
        intent.intents.forEach(apply);
        break;
      case 'update': {
        // Only the label lives in the model; geometry is solved, so those edits are dropped.
        const label = labelOf(intent.values);
        if (label !== undefined) {
          registry.set(model, {
            ...current,
            nodes: current.nodes.map((node) => (node.id === intent.id ? { ...node, label } : node)),
          });
        }
        break;
      }
      default:
        break;
    }
  };
  return {
    scene,
    apply,
    capabilities: constrainedCapabilities,
    snapshot: () => registry.get(model),
    restore: (snapshot) => {
      if (isConstrainedModel(snapshot)) {
        registry.set(model, snapshot);
      }
    },
  };
};
