//
// Copyright 2026 DXOS.org
//

//
// Mermaid flowchart dialect: parses the subset needed for block diagrams (node declarations,
// subgraphs, directed edges) and compiles it to scene commands with a layered layout. Mermaid
// carries no coordinates, so the dialect owns placement — see `dialect.ts` for the contract.
//

import type * as Scene from './scene';

export type Direction = 'TB' | 'BT' | 'LR' | 'RL';

export type MermaidNode = {
  id: string;
  label: string;
  /** Enclosing subgraph id, when declared inside one. */
  group?: string;
};

export type MermaidGroup = {
  id: string;
  label: string;
  children: string[];
};

export type MermaidEdge = {
  from: string;
  to: string;
  label?: string;
};

export type MermaidGraph = {
  direction: Direction;
  nodes: MermaidNode[];
  groups: MermaidGroup[];
  edges: MermaidEdge[];
};

const DIRECTIONS: Direction[] = ['TB', 'BT', 'LR', 'RL'];

// `A[Label]`, `A(Label)`, `A{Label}` or a bare `A`.
const NODE = /^([A-Za-z0-9_-]+)(?:\[(.*?)\]|\((.*?)\)|\{(.*?)\})?$/;
// `A --> B`, `A-->|label|B`, `A --- B`.
const EDGE = /^(.+?)\s*(-->|---|-\.->|==>)\s*(?:\|(.*?)\|\s*)?(.+)$/;
const SUBGRAPH = /^subgraph\s+([A-Za-z0-9_-]+)(?:\s*\[(.*?)\])?\s*$/;

const unquote = (value: string) => value.trim().replace(/^"(.*)"$/, '$1');

/** Parse a mermaid flowchart into a neutral graph. Unrecognised lines are ignored. */
export const parse = (source: string): MermaidGraph => {
  const nodes = new Map<string, MermaidNode>();
  const groups: MermaidGroup[] = [];
  const edges: MermaidEdge[] = [];
  let direction: Direction = 'TB';
  const stack: string[] = [];

  const declare = (token: string): string | undefined => {
    const match = NODE.exec(token.trim());
    if (!match) {
      return undefined;
    }
    const [, id, square, round, curly] = match;
    const label = unquote(square ?? round ?? curly ?? id);
    const group = stack[stack.length - 1];
    const existing = nodes.get(id);
    if (existing) {
      // A later declaration with an explicit label wins; the first mention fixes the group.
      if (square ?? round ?? curly) {
        existing.label = label;
      }
      return id;
    }
    nodes.set(id, { id, label, ...(group ? { group } : {}) });
    if (group) {
      groups.find((entry) => entry.id === group)?.children.push(id);
    }
    return id;
  };

  for (const raw of source.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('%%')) {
      continue;
    }

    const header = /^(?:flowchart|graph)\s+([A-Za-z]{2})$/.exec(line);
    if (header) {
      const value = header[1].toUpperCase() as Direction;
      direction = DIRECTIONS.includes(value) ? value : 'TB';
      continue;
    }

    const subgraph = SUBGRAPH.exec(line);
    if (subgraph) {
      const [, id, label] = subgraph;
      groups.push({ id, label: unquote(label ?? id), children: [] });
      stack.push(id);
      continue;
    }

    if (line === 'end') {
      stack.pop();
      continue;
    }

    const edge = EDGE.exec(line);
    if (edge) {
      const [, from, , label, to] = edge;
      const fromId = declare(from);
      const toId = declare(to);
      if (fromId && toId) {
        edges.push({ from: fromId, to: toId, ...(label ? { label: unquote(label) } : {}) });
      }
      continue;
    }

    declare(line);
  }

  return { direction, nodes: [...nodes.values()], groups, edges };
};

/** Layout constants in scene units. */
const NODE_W = 100;
const NODE_H = 50;
const GAP_MAIN = 60;
const GAP_CROSS = 40;
const GROUP_PAD = 24;

/**
 * Edges that close a cycle, found by DFS: an edge into a node still on the stack points backwards.
 * Ranking ignores them, so `C --> Y --> C` ranks C by its forward predecessors alone instead of
 * chasing the loop.
 */
const backEdges = (graph: MermaidGraph): Set<MermaidEdge> => {
  const outgoing = new Map<string, MermaidEdge[]>();
  for (const edge of graph.edges) {
    outgoing.set(edge.from, [...(outgoing.get(edge.from) ?? []), edge]);
  }

  const back = new Set<MermaidEdge>();
  const done = new Set<string>();
  const onStack = new Set<string>();

  const visit = (id: string) => {
    onStack.add(id);
    for (const edge of outgoing.get(id) ?? []) {
      if (onStack.has(edge.to)) {
        back.add(edge);
      } else if (!done.has(edge.to)) {
        visit(edge.to);
      }
    }
    onStack.delete(id);
    done.add(id);
  };

  // Roots first so the DFS classifies edges along the natural reading order of the diagram.
  const targets = new Set(graph.edges.map((edge) => edge.to));
  for (const node of graph.nodes) {
    if (!targets.has(node.id) && !done.has(node.id)) {
      visit(node.id);
    }
  }
  for (const node of graph.nodes) {
    if (!done.has(node.id)) {
      visit(node.id);
    }
  }
  return back;
};

/** Assign each node a rank one past its deepest forward predecessor. */
const rank = (graph: MermaidGraph): Map<string, number> => {
  const back = backEdges(graph);
  const forward = graph.edges.filter((edge) => !back.has(edge));
  const ranks = new Map(graph.nodes.map((node) => [node.id, 0]));
  for (let pass = 0; pass < graph.nodes.length; pass++) {
    let changed = false;
    for (const edge of forward) {
      const next = (ranks.get(edge.from) ?? 0) + 1;
      if (next > (ranks.get(edge.to) ?? 0)) {
        ranks.set(edge.to, next);
        changed = true;
      }
    }
    if (!changed) {
      break;
    }
  }
  return ranks;
};

export type CompileOptions = {
  /** Canvas position of the diagram's top-left, in canvas px. */
  origin?: Scene.Point;
  /** Canvas px per scene unit. */
  scale?: number;
};

/**
 * Compile a mermaid flowchart into scene commands: one world object per node (element `box`),
 * one per subgraph frame, and an `edges` object holding the connectors as bound arrows.
 */
export const compile = (source: string, options: CompileOptions = {}): Scene.Command[] => {
  const graph = parse(source);
  const { origin = { x: 0, y: 0 }, scale = 1 } = options;
  const ranks = rank(graph);
  const horizontal = graph.direction === 'LR' || graph.direction === 'RL';

  // Group nodes by rank, preserving declaration order within each.
  const lanes = new Map<number, MermaidNode[]>();
  for (const node of graph.nodes) {
    const value = ranks.get(node.id) ?? 0;
    lanes.set(value, [...(lanes.get(value) ?? []), node]);
  }
  const widest = Math.max(...[...lanes.values()].map((lane) => lane.length), 1);

  const positions = new Map<string, Scene.Point>();
  for (const [lane, members] of lanes) {
    const span = members.length * NODE_W + (members.length - 1) * GAP_CROSS;
    const offset = (widest * NODE_W + (widest - 1) * GAP_CROSS - span) / 2;
    members.forEach((node, index) => {
      const cross = offset + index * (NODE_W + GAP_CROSS);
      const main = lane * (NODE_H + GAP_MAIN);
      positions.set(node.id, horizontal ? { x: main, y: cross } : { x: cross, y: main });
    });
  }

  const commands: Scene.Command[] = [];

  // Frames first so nodes paint above them.
  for (const group of graph.groups) {
    const members = group.children.map((id) => positions.get(id)).filter((point): point is Scene.Point => !!point);
    if (members.length === 0) {
      continue;
    }
    const minX = Math.min(...members.map((point) => point.x)) - GROUP_PAD;
    const minY = Math.min(...members.map((point) => point.y)) - GROUP_PAD;
    const maxX = Math.max(...members.map((point) => point.x)) + NODE_W + GROUP_PAD;
    const maxY = Math.max(...members.map((point) => point.y)) + NODE_H + GROUP_PAD;
    commands.push({
      op: 'upsert-object',
      object: {
        id: group.id,
        origin: { x: origin.x + minX * scale, y: origin.y + minY * scale },
        scale,
        elements: [
          {
            kind: 'rect',
            id: 'frame',
            x: 0,
            y: 0,
            w: maxX - minX,
            h: maxY - minY,
            stroke: 'dashed',
            color: 'grey',
            ...(group.label.trim() ? { text: group.label } : {}),
          },
        ],
      },
    });
  }

  for (const node of graph.nodes) {
    const point = positions.get(node.id)!;
    commands.push({
      op: 'upsert-object',
      object: {
        id: node.id,
        origin: { x: origin.x + point.x * scale, y: origin.y + point.y * scale },
        scale,
        elements: [{ kind: 'rect', id: 'box', x: 0, y: 0, w: NODE_W, h: NODE_H, text: node.label }],
      },
    });
  }

  if (graph.edges.length > 0) {
    commands.push({
      op: 'upsert-object',
      object: {
        id: 'edges',
        origin,
        scale,
        elements: graph.edges.map((edge) => ({
          kind: 'arrow' as const,
          id: `${edge.from}-${edge.to}`,
          from: `${edge.from}/box`,
          to: `${edge.to}/box`,
          ...(edge.label ? { text: edge.label } : {}),
        })),
      },
    });
  }

  return commands;
};
