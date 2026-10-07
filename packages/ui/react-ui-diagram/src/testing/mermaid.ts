//
// Copyright 2026 DXOS.org
//

//
// Projects Mermaid flowchart text onto the neutral graph, so a story can demonstrate the
// source → projection → renderer path end to end.
//
// This is a story fixture, not the real dialect: the design puts the Mermaid dialect in
// plugin-illustrator with a span-aware parser and a canonical printer for write-back. What matters
// here is the shape of the boundary — text in, neutral graph plus provenance out, and the renderer
// downstream of both.
//

import { type Edge, type Node, type Projection } from '../types/index.ts';

/** `A[Label]`, `A(Label)`, `A{Label}`, or a bare `A`. */
const NODE = /^([A-Za-z0-9_-]+)(?:\[(.*?)\]|\((.*?)\)|\{(.*?)\})?$/;
const EDGE = /^(.+?)\s*(-->|---|-\.->|==>)\s*(?:\|(.*?)\|\s*)?(.+)$/;
const SUBGRAPH = /^subgraph\s+([A-Za-z0-9_-]+)(?:\s*\[(.*?)\])?\s*$/;
const HEADER = /^(?:flowchart|graph)\s+([A-Za-z]{2})$/;

const unquote = (value: string) => value.trim().replace(/^"(.*)"$/, '$1');

/** Ports at the midpoint of each side; `offset` makes additional slots per side expressible. */
const PORTS: Node['ports'] = [
  { id: 'n', side: 'top', offset: 0.5 },
  { id: 'e', side: 'right', offset: 0.5 },
  { id: 's', side: 'bottom', offset: 0.5 },
  { id: 'w', side: 'left', offset: 0.5 },
];

export type Direction = 'TB' | 'BT' | 'LR' | 'RL';

/** Which sides an edge leaves and enters, given the flow direction. */
const routing = (direction: Direction): { from: string; to: string } => {
  switch (direction) {
    case 'LR':
      return { from: 'e', to: 'w' };
    case 'RL':
      return { from: 'w', to: 'e' };
    case 'BT':
      return { from: 'n', to: 's' };
    default:
      return { from: 's', to: 'n' };
  }
};

/**
 * Compile Mermaid flowchart text into a {@link Projection}. Unrecognised lines are ignored so typing in
 * the editor degrades gracefully rather than throwing mid-keystroke.
 */
export const projectMermaid = (source: string): Projection => {
  const nodes = new Map<string, Node>();
  const edges: Edge[] = [];
  const provenance: Record<string, unknown> = {};
  const stack: string[] = [];
  let direction: Direction = 'TB';

  const declare = (token: string, line: number): string | undefined => {
    const match = NODE.exec(token.trim());
    if (!match) {
      return undefined;
    }
    const [, id, square, round, curly] = match;
    const explicit = square ?? round ?? curly;
    const parent = stack[stack.length - 1];
    const existing = nodes.get(id);
    if (existing) {
      // A later declaration with an explicit label wins; the first mention fixes the group.
      if (explicit !== undefined) {
        nodes.set(id, { ...existing, label: unquote(explicit) });
      }
      return id;
    }
    nodes.set(id, {
      id,
      type: 'node',
      label: unquote(explicit ?? id),
      ports: PORTS,
      ...(parent ? { parent } : {}),
    });
    provenance[id] = { line };
    return id;
  };

  source.split('\n').forEach((raw, index) => {
    const text = raw.trim();
    if (!text || text.startsWith('%%')) {
      return;
    }

    const header = HEADER.exec(text);
    if (header) {
      const value = header[1].toUpperCase();
      direction = (['TB', 'BT', 'LR', 'RL'] as const).find((entry) => entry === value) ?? 'TB';
      return;
    }

    const subgraph = SUBGRAPH.exec(text);
    if (subgraph) {
      const [, id, label] = subgraph;
      const resolved = unquote(label ?? id).trim();
      const parent = stack[stack.length - 1];
      nodes.set(id, {
        id,
        type: 'group',
        ...(resolved ? { label: resolved } : {}),
        ...(parent ? { parent } : {}),
      });
      provenance[id] = { line: index };
      stack.push(id);
      return;
    }

    if (text === 'end') {
      stack.pop();
      return;
    }

    const edge = EDGE.exec(text);
    if (edge) {
      const [, from, , label, to] = edge;
      const source = declare(from, index);
      const target = declare(to, index);
      if (source && target) {
        const { from: sourcePort, to: targetPort } = routing(direction);
        const id = `${source}->${target}`;
        edges.push({
          id,
          type: 'link',
          source,
          target,
          sourcePort,
          targetPort,
          ...(label ? { label: unquote(label) } : {}),
        });
        provenance[id] = { line: index };
      }
      return;
    }

    declare(text, index);
  });

  return { graph: { nodes: [...nodes.values()], edges }, provenance };
};
