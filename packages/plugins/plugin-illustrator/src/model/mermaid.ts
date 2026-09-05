//
// Copyright 2026 DXOS.org
//

//
// Mermaid flowchart dialect: parses the subset needed for block diagrams (node declarations,
// subgraphs, directed edges) and compiles it to scene commands with a layered layout. Mermaid
// carries no coordinates, so the dialect owns placement — see `dialect.ts` for the contract.
//

import * as Layout from './layout';
import type * as Scene from './scene';

export type Direction = 'TB' | 'BT' | 'LR' | 'RL';

export type MermaidNode = {
  id: string;
  label: string;
  /** Enclosing subgraph id, when declared inside one. */
  group?: string;
  /** What the node depicts (DXN or URI), from a `%% ref <id> <target>` directive. */
  ref?: string;
};

export type MermaidGroup = {
  id: string;
  label: string;
  children: string[];
};

/** Relationship kind, from the edge token; drawn with the UML end markers in `markers`. */
export type RelationKind = 'reference' | 'inheritance' | 'hasMany' | 'contains';

export type MermaidEdge = {
  from: string;
  to: string;
  kind: RelationKind;
  label?: string;
};

/**
 * Edge tokens: mermaid's own arrows read as references; the classDiagram-style `--|>` (hollow
 * triangle) and ER-style `--{` (crow's foot) and `o-->` (circle at the source) extend the flowchart
 * grammar with the UML kinds, at the cost of mermaid.js rejecting those lines.
 */
const EDGE_KINDS: Record<string, RelationKind> = {
  '-->': 'reference',
  '---': 'reference',
  '-.->': 'reference',
  '==>': 'reference',
  '--|>': 'inheritance',
  '--{': 'hasMany',
  'o-->': 'contains',
};

/** Scene arrow markers for a relationship kind. */
export const markers = (kind: RelationKind): Pick<Scene.Arrow, 'head' | 'tail'> => {
  switch (kind) {
    case 'inheritance':
      return { head: 'triangle' };
    case 'hasMany':
      return { head: 'crowsfoot' };
    case 'contains':
      return { tail: 'circle' };
    default:
      return {};
  }
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
// `A --> B`, `A-->|label|B`, `A --- B`, plus the UML kinds `B --|> A`, `X --{ Y`, `A o--> B`.
const EDGE = /^(.+?)\s*(o-->|--\|>|--\{|-->|---|-\.->|==>)\s*(?:\|(.*?)\|\s*)?(.+)$/;
const SUBGRAPH = /^subgraph\s+([A-Za-z0-9_-]+)(?:\s*\[(.*?)\])?\s*$/;

// `%% ref A packages/core/echo` — a comment to mermaid proper, so sources stay portable.
const REF = /^%%\s*ref\s+([A-Za-z0-9_-]+)\s+(\S+)\s*$/;

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

  const refs = new Map<string, string>();
  for (const raw of source.split('\n')) {
    const line = raw.trim();
    const ref = REF.exec(line);
    if (ref) {
      refs.set(ref[1], ref[2]);
      continue;
    }
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
      const [, from, token, label, to] = edge;
      const fromId = declare(from);
      const toId = declare(to);
      if (fromId && toId) {
        edges.push({
          from: fromId,
          to: toId,
          kind: EDGE_KINDS[token] ?? 'reference',
          ...(label ? { label: unquote(label) } : {}),
        });
      }
      continue;
    }

    declare(line);
  }

  // Directives may precede or follow the node they name.
  return {
    direction,
    nodes: [...nodes.values()].map((node) => (refs.has(node.id) ? { ...node, ref: refs.get(node.id) } : node)),
    groups,
    edges,
  };
};

/** Layout constants in scene units. */
const NODE_W = 100;
const NODE_H = 50;
const GAP_MAIN = 60;
const GAP_CROSS = 40;
const GROUP_PAD = 24;

/** Assign each node a rank one past its deepest forward predecessor. */
const rank = (graph: MermaidGraph): Map<string, number> =>
  Layout.rank(
    graph.nodes.map((node) => node.id),
    graph.edges,
  );

export type CompileOptions = {
  /** Canvas position of the diagram's top-left, in canvas px. */
  origin?: Scene.Point;
  /** Canvas px per scene unit. */
  scale?: number;
  /** Gap between ranks along the flow direction, in scene units (default 60). */
  gapMain?: number;
  /** Gap between nodes within a rank, in scene units (default 40). */
  gapCross?: number;
};

/**
 * Compile a mermaid flowchart into scene commands: one world object per node (element `box`),
 * one per subgraph frame, and an `edges` object holding the connectors as bound arrows.
 */
export const compile = (source: string, options: CompileOptions = {}): Scene.Command[] => {
  const graph = parse(source);
  const { origin = { x: 0, y: 0 }, scale = 1, gapMain = GAP_MAIN, gapCross = GAP_CROSS } = options;
  const ranks = rank(graph);
  const horizontal = graph.direction === 'LR' || graph.direction === 'RL';

  // Group nodes by rank, preserving declaration order within each.
  const lanes = new Map<number, MermaidNode[]>();
  for (const node of graph.nodes) {
    const value = ranks.get(node.id) ?? 0;
    lanes.set(value, [...(lanes.get(value) ?? []), node]);
  }
  const widest = Math.max(...[...lanes.values()].map((lane) => lane.length), 1);

  // Axis-specific node sizes: for LR/RL the main axis advances by width and lanes stack by height.
  const mainSize = horizontal ? NODE_W : NODE_H;
  const crossSize = horizontal ? NODE_H : NODE_W;
  const positions = new Map<string, Scene.Point>();
  for (const [lane, members] of lanes) {
    const span = members.length * crossSize + (members.length - 1) * gapCross;
    const offset = (widest * crossSize + (widest - 1) * gapCross - span) / 2;
    members.forEach((node, index) => {
      const cross = offset + index * (crossSize + gapCross);
      const main = lane * (mainSize + gapMain);
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
        ...(node.ref ? { ref: node.ref } : {}),
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
          ...markers(edge.kind),
          ...(edge.label ? { text: edge.label } : {}),
        })),
      },
    });
  }

  return commands;
};
