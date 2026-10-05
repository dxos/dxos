//
// Copyright 2026 DXOS.org
//

//
// The semantic diagram: what the DSL's `diagram`/`group`/`node`/`edge` statements say, before any
// coordinate exists. Every hint is optional — a pin, a relation, an allowed side, a waypoint — and
// `semantic-engine.ts` fills whatever is left open. Source ranges ride along so the engine can
// report a contradiction against the statement that caused it.
//

import type * as Scene from './scene.ts';

export type Range = { from: number; to: number };

/** A problem the engine found in the intent, with the source range it belongs to. */
export type Issue = Range & { severity: 'error' | 'warning'; message: string };

export type Side = 'top' | 'bottom' | 'left' | 'right';
export const SIDES: readonly Side[] = ['top', 'bottom', 'left', 'right'];

/** Which way edges should read; the placement prefers targets on this side of their sources. */
export type Flow = 'down' | 'up' | 'right' | 'left';
export const FLOWS: readonly Flow[] = ['down', 'up', 'right', 'left'];

export type RelationKind = 'right-of' | 'left-of' | 'above' | 'below' | 'same-row' | 'same-col';
export const RELATION_KINDS: readonly RelationKind[] = [
  'right-of',
  'left-of',
  'above',
  'below',
  'same-row',
  'same-col',
];

/** `right-of X`: same row as X and to its right; `~` makes it a preference instead of a rule. */
export type Relation = { kind: RelationKind; target: string; soft: boolean; range: Range };

/** `@ x,y` pins the box's top-left exactly, in scene units; `@cell(c,r)` pins its grid cell. */
export type Pin = ({ kind: 'point'; x: number; y: number } | { kind: 'cell'; col: number; row: number }) & {
  range: Range;
};

export type Node = {
  id: string;
  label: string;
  group?: string;
  ref?: string;
  pin?: Pin;
  relations: Relation[];
  shape?: Scene.BoxKind;
  color?: Scene.Color;
  fill?: Scene.Fill;
  stroke?: Scene.Stroke;
  range: Range;
};

export type Group = {
  id: string;
  label: string;
  relations: Relation[];
  /** Extra clear space, in scene units, between this group and the groups it is placed relative to. */
  gap?: number;
  color?: Scene.Color;
  range: Range;
};

/** One coordinate or both; `cell` units are grid cells, where `n.5` is the channel after cell `n`. */
export type Waypoint = { x?: number; y?: number; unit: 'scene' | 'cell'; range: Range };

export type End = { node: string; sides?: readonly Side[]; range: Range };

/**
 * Relationship words an edge may use in place of `->`, each naming the scene relation it draws.
 * The left end is the subtype, the whole, the owner, or the one side.
 */
export const RELATIONSHIPS: Readonly<Record<string, Scene.Relation>> = {
  'extends': 'inheritance',
  'implements': 'implementation',
  'composes': 'composition',
  'owns': 'aggregation',
  'one-to-many': 'one-to-many',
  'many-to-many': 'many-to-many',
  'depends-on': 'dependency',
};

/** Relations whose target is the abstraction, which reads best above its subtypes. */
export const pointsUp = (relation: Scene.Relation | undefined): boolean =>
  relation === 'inheritance' || relation === 'implementation';

export type EdgeStyle = {
  relation?: Scene.Relation;
  head?: Scene.ArrowHead;
  tail?: Scene.ArrowTail;
  stroke?: Scene.Stroke;
  color?: Scene.Color;
};

export type Edge = EdgeStyle & {
  /** Scene id of the connector, unique in the diagram. */
  id: string;
  from: End;
  to: End;
  label?: string;
  via: readonly Waypoint[];
  /** Edges with the same bus key and hub share one trunk. */
  bus?: string;
  range: Range;
};

/**
 * Edges merged into one trunk: the hub end is shared, each spoke ends at its own node. `out` fans
 * from the hub to the spokes, `in` gathers the spokes into the hub.
 */
export type Bus = {
  id: string;
  hub: End;
  direction: 'out' | 'in';
  edges: readonly Edge[];
  /** Text on the trunk, from a multi-target statement's label. */
  label?: string;
};

export type Size = { w: number; h: number };

export type Diagram = {
  flow: Flow;
  origin: Scene.Point;
  /** Cell pitch (box plus gutter), in scene units; measured from the boxes when absent. */
  grid?: Size;
  /** Box size; measured from the longest label when absent. */
  box?: Size;
  nodes: Node[];
  groups: Group[];
  edges: Edge[];
  /** Trunk labels by bus key (`<hub>|<name>|<direction>`), from multi-target statements. */
  busLabels: Map<string, string>;
  /** Whether any statement said how to place or route — when none did, the mermaid engine's search is also tried. */
  hinted: boolean;
};

export const empty = (): Diagram => ({
  flow: 'down',
  origin: { x: 0, y: 0 },
  nodes: [],
  groups: [],
  edges: [],
  busLabels: new Map(),
  hinted: false,
});

/** The key edges share a trunk under. */
export const busKey = (hub: string, name: string, direction: Bus['direction']): string => `${hub}|${name}|${direction}`;

/** The edges grouped into buses (two or more edges with one key) and the rest. */
export const buses = (diagram: Diagram): { buses: Bus[]; single: Edge[] } => {
  const byKey = new Map<string, { hub: End; direction: Bus['direction']; edges: Edge[] }>();
  for (const edge of diagram.edges) {
    if (edge.bus === undefined) {
      continue;
    }
    const [hub, direction] = edge.bus.endsWith('|in') ? [edge.to, 'in' as const] : [edge.from, 'out' as const];
    const entry = byKey.get(edge.bus) ?? { hub, direction, edges: [] };
    entry.edges.push(edge);
    byKey.set(edge.bus, entry);
  }
  const result: Bus[] = [];
  const merged = new Set<Edge>();
  for (const [key, { hub, direction, edges }] of byKey) {
    if (edges.length < 2) {
      continue;
    }
    edges.forEach((edge) => merged.add(edge));
    result.push({
      id: `${hub.node}-bus-${result.length}`,
      hub,
      direction,
      edges,
      ...(diagram.busLabels.has(key) ? { label: diagram.busLabels.get(key) } : {}),
    });
  }
  return { buses: result, single: diagram.edges.filter((edge) => !merged.has(edge)) };
};

/** The mermaid dialect's token per relation, so its layering ranks abstractions as ours does. */
const MERMAID_TOKEN: Record<Scene.Relation, string> = {
  'association': '-->',
  'dependency': '-.->',
  'inheritance': '--|>',
  'implementation': '..|>',
  'composition': 'o-->',
  'aggregation': 'o-->',
  'one-to-many': '--{',
  'many-to-many': '-->',
};

const MERMAID_ID = /^[A-Za-z0-9_-]+$/;
const MERMAID_TEXT = /^[^[\]|"\n]*$/;

/**
 * The diagram as a mermaid flowchart, for the engine's own search when nothing was hinted; undefined
 * when an id or label cannot be written in the mermaid subset.
 */
export const toMermaid = (diagram: Diagram): string | undefined => {
  const direction = { down: 'TB', up: 'BT', right: 'LR', left: 'RL' }[diagram.flow];
  const node = (entry: Node) => `${entry.id}[${entry.label}]`;
  const writable =
    diagram.nodes.every((entry) => MERMAID_ID.test(entry.id) && MERMAID_TEXT.test(entry.label)) &&
    diagram.groups.every((group) => MERMAID_ID.test(group.id) && MERMAID_TEXT.test(group.label)) &&
    diagram.edges.every((edge) => edge.label === undefined || MERMAID_TEXT.test(edge.label));
  if (!writable) {
    return undefined;
  }
  const lines = [`flowchart ${direction}`];
  for (const group of diagram.groups) {
    lines.push(`  subgraph ${group.id} [${group.label}]`);
    diagram.nodes.filter((entry) => entry.group === group.id).forEach((entry) => lines.push(`    ${node(entry)}`));
    lines.push('  end');
  }
  diagram.nodes.filter((entry) => entry.group === undefined).forEach((entry) => lines.push(`  ${node(entry)}`));
  for (const edge of diagram.edges) {
    lines.push(
      `  ${edge.from.node} ${MERMAID_TOKEN[edge.relation ?? 'association']}${edge.label ? `|${edge.label}|` : ''} ${edge.to.node}`,
    );
  }
  diagram.nodes.forEach(
    (entry) => entry.ref && !/\s/.test(entry.ref) && lines.push(`  %% ref ${entry.id} ${entry.ref}`),
  );
  return lines.join('\n');
};
