//
// Copyright 2026 DXOS.org
//
// @import-as-namespace
//

import * as Effect from 'effect/Effect';
import * as Result from 'effect/Result';
import * as Schema from 'effect/Schema';

import { Mermaid } from '@dxos/diagram';

/**
 * What a `display.diagram` panel carries: the graph plugin-illustrator's engine (`@dxos/diagram`)
 * lays out — direction, flat groups, boxes and typed, labelled edges — and nothing it would drop.
 * The sandbox accepts it as an object or as mermaid flowchart text read by the illustrator's own
 * parser; either way the log stores the normalized graph, so a reader never re-parses mermaid.
 * Kept free of DOM, Node and framework code: the host, the web UI and its worker share it.
 */

export const Direction = Schema.Literals(['TB', 'LR', 'BT', 'RL']);

export const EdgeKind = Schema.Literals(['reference', 'inheritance', 'implements', 'hasMany', 'contains', 'creates']);

/** The sandbox's input: ids are free text, and only `nodes` is required. */
export const Spec = Schema.Struct({
  direction: Schema.optional(Direction),
  groups: Schema.optional(Schema.Array(Schema.Struct({ id: Schema.String, label: Schema.optional(Schema.String) }))),
  nodes: Schema.Array(
    Schema.Struct({
      id: Schema.String,
      label: Schema.optional(Schema.String),
      group: Schema.optional(Schema.String),
      ref: Schema.optional(Schema.String),
    }),
  ),
  edges: Schema.optional(
    Schema.Array(
      Schema.Struct({
        from: Schema.String,
        to: Schema.String,
        label: Schema.optional(Schema.String),
        kind: Schema.optional(EdgeKind),
      }),
    ),
  ),
});

export type Spec = typeof Spec.Type;

export type Node = { readonly id: string; readonly label: string; readonly group?: string; readonly ref?: string };
export type Group = { readonly id: string; readonly label: string };
export type Edge = {
  readonly from: string;
  readonly to: string;
  readonly label?: string;
  readonly kind?: typeof EdgeKind.Type;
};

/** A spec with every reference resolved: what the log stores and the renderer reads. */
export type Graph = {
  readonly direction: typeof Direction.Type;
  readonly groups: readonly Group[];
  readonly nodes: readonly Node[];
  readonly edges: readonly Edge[];
};

/** Why a diagram cannot be drawn, worded for whoever wrote it: the model, or the user reading an old panel. */
export type Problem = { readonly message: string };

const problem = (message: string): Result.Result<never, Problem> => Result.fail({ message });

/**
 * Resolves a spec into a graph, forgiving what a model gets wrong without losing anything it meant:
 * an edge or group named but never declared is declared with its id as the label, a node declared
 * twice keeps its first group and its last label, and a group nobody sits in is dropped.
 */
export const normalize = (spec: Spec): Result.Result<Graph, Problem> => {
  const nodes = new Map<string, { id: string; label: string; group?: string; ref?: string }>();
  // Not `declare`: Bun strips a statement opening with `declare(` as an ambient declaration.
  const add = (id: string, label?: string, group?: string, ref?: string) => {
    const existing = nodes.get(id);
    if (existing) {
      existing.label = label ?? existing.label;
      existing.group ??= group;
      existing.ref ??= ref;
    } else {
      nodes.set(id, { id, label: label ?? id, ...(group ? { group } : {}), ...(ref ? { ref } : {}) });
    }
  };
  for (const node of spec.nodes) {
    add(node.id, node.label, node.group, node.ref);
  }
  const edges = (spec.edges ?? []).map((edge): Edge => {
    add(edge.from);
    add(edge.to);
    return {
      from: edge.from,
      to: edge.to,
      ...(edge.label ? { label: edge.label } : {}),
      ...(edge.kind && edge.kind !== 'reference' ? { kind: edge.kind } : {}),
    };
  });
  if (nodes.size === 0) {
    return problem('The diagram has no nodes.');
  }
  const labels = new Map((spec.groups ?? []).map((group) => [group.id, group.label ?? group.id]));
  const used = new Set([...nodes.values()].flatMap((node) => (node.group ? [node.group] : [])));
  // Declared groups keep their order, since the engine tints groups in declaration order.
  const order = [...new Set([...labels.keys(), ...used])].filter((id) => used.has(id));
  return Result.succeed({
    direction: spec.direction ?? 'TB',
    groups: order.map((id) => ({ id, label: labels.get(id) ?? id })),
    nodes: [...nodes.values()],
    edges,
  });
};

const HEADER = /^(?:flowchart|graph)\b/;

const ARROW = /\s*(o-->|--\|>|\.\.\|>|--\{|-->|---|-\.->|==>)\s*(\|[^|]*\|)?\s*/;

/** Splits on `;` outside brackets and quotes, since a label may contain one. */
const statements = (line: string): string[] => {
  const parts: string[] = [];
  let depth = 0;
  let quoted = false;
  let current = '';
  for (const char of line) {
    if (char === '"') {
      quoted = !quoted;
    } else if (!quoted && '[({'.includes(char)) {
      depth++;
    } else if (!quoted && '])}'.includes(char)) {
      depth = Math.max(0, depth - 1);
    } else if (char === ';' && !quoted && depth === 0) {
      parts.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  return [...parts, current].map((part) => part.trim()).filter((part) => part.length > 0);
};

/** `A & B` outside a label, as the operands of `A & B --> C`. */
const operands = (token: string): string[] => token.split(/\s+&\s+(?![^[({]*[\])}])/);

/**
 * `A --> B --> C` and `A & B --> C` become one edge per line, because the parser reads a single
 * edge, between single nodes, per line.
 */
const unchain = (statement: string): string[] => {
  const tokens = statement.split(ARROW);
  // `split` with two capture groups yields [node, arrow, label, node, arrow, label, node, …].
  if (tokens.length < 4) {
    return [statement];
  }
  const edges: string[] = [];
  for (let index = 0; index + 3 < tokens.length; index += 3) {
    for (const from of operands(tokens[index])) {
      for (const to of operands(tokens[index + 3])) {
        edges.push(`${from} ${tokens[index + 1]}${tokens[index + 2] ?? ''} ${to}`);
      }
    }
  }
  return edges;
};

export type Prepared =
  | { readonly kind: 'flowchart'; readonly source: string }
  /** `type` is the source's first keyword, such as `sequenceDiagram`. */
  | { readonly kind: 'unsupported'; readonly type: string };

/**
 * Normalizes what a model commonly writes — `graph TD;`, `;`-separated statements, chained and
 * `&` edges — into the one-statement-per-line form the parser reads; other kinds are reported, not
 * guessed at.
 */
export const prepare = (source: string): Prepared => {
  const lines = source
    .split('\n')
    .flatMap((line) => (line.trim().startsWith('%%') ? [line.trim()] : statements(line)))
    .flatMap((line) => (line.startsWith('%%') ? [line] : unchain(line)));
  const header = lines.find((line) => !line.startsWith('%%'));
  if (!header || !HEADER.test(header)) {
    return { kind: 'unsupported', type: header?.split(/\s/)[0] ?? 'empty' };
  }
  return { kind: 'flowchart', source: lines.join('\n') };
};

/** A mermaid flowchart, read by the illustrator's parser; lines it does not understand are ignored, as it ignores them. */
export const fromMermaid = (source: string): Result.Result<Graph, Problem> => {
  const prepared = prepare(source);
  if (prepared.kind === 'unsupported') {
    return problem(
      `The illustrator draws flowcharts only, not ${prepared.type}. Pass { nodes, edges, groups } or a \`flowchart\` source.`,
    );
  }
  const graph = Mermaid.parse(prepared.source);
  if (graph.nodes.length === 0) {
    return problem('The illustrator found no nodes in this flowchart.');
  }
  return normalize({
    direction: graph.direction,
    groups: graph.groups.map(({ id, label }) => ({ id, label })),
    nodes: graph.nodes.map(({ id, label, group, ref }) => ({
      id,
      label,
      ...(group ? { group } : {}),
      ...(ref ? { ref } : {}),
    })),
    edges: graph.edges.map(({ from, to, label, kind }) => ({ from, to, kind, ...(label ? { label } : {}) })),
  });
};

const decodeSpec = Schema.decodeUnknownResult(Spec);

/** A spec handed over as a value — by the sandbox, or parsed from JSON. */
export const fromValue = (value: unknown): Result.Result<Graph, Problem> => {
  const decoded = decodeSpec(value);
  return Result.isFailure(decoded)
    ? problem(`The diagram is not a valid { nodes, edges, groups } spec: ${decoded.failure.message}`)
    : normalize(decoded.success);
};

/**
 * Reads a panel's content: the JSON graph `display.diagram` stores, or the mermaid text that panels
 * logged before the rename (and as kind 'mermaid') still carry.
 */
export const read = (content: string): Result.Result<Graph, Problem> => {
  if (content.trimStart().startsWith('{')) {
    try {
      return fromValue(JSON.parse(content));
    } catch {
      return problem('The diagram is neither a JSON spec nor a mermaid flowchart.');
    }
  }
  return fromMermaid(content);
};

/** What a `display.diagram` panel stores for `content`: the normalized graph as JSON. */
export const stored = (content: string): Effect.Effect<string, Problem> =>
  Effect.fromResult(read(content)).pipe(Effect.map((graph) => JSON.stringify(graph)));

/** Identifiers the parser accepts, and nothing an arrow token could start with. */
const safeId = (id: string): string => id.replace(/[^A-Za-z0-9_]/g, '_') || '_';

/** Text the parser would end early on or split across lines. */
const oneLine = (text: string): string => text.replace(/\s+/g, ' ').trim();

const EDGE_TOKEN: Record<NonNullable<Edge['kind']>, string> = {
  reference: '-->',
  creates: '-.->',
  inheritance: '--|>',
  implements: '..|>',
  hasMany: '--{',
  contains: 'o-->',
};

/** Parser-safe, unique ids for a graph's nodes and groups, which become its scene object ids. */
const mintIds = (graph: Graph) => {
  const taken = new Set<string>();
  const mint = (id: string, prefix = ''): string => {
    const base = `${prefix}${safeId(id)}`;
    let candidate = base;
    for (let suffix = 2; taken.has(candidate); suffix++) {
      candidate = `${base}_${suffix}`;
    }
    taken.add(candidate);
    return candidate;
  };
  return {
    nodes: new Map(graph.nodes.map((node) => [node.id, mint(node.id)])),
    groups: new Map(graph.groups.map((group) => [group.id, mint(group.id, 'group_')])),
  };
};

/** The scene object id the layout gives each node, by the node's own id. */
export const objectIds = (graph: Graph): ReadonlyMap<string, string> => mintIds(graph).nodes;

/**
 * The graph as the mermaid subset the engine parses, which is the engine's only input. Every field
 * survives — `Mermaid.parse(toSource(graph))` yields the same graph under parser-safe ids — so the
 * text is a transport, not a lossy format.
 */
export const toSource = (graph: Graph): string => {
  const { nodes: nodeIds, groups: groupIds } = mintIds(graph);
  const line = (node: Node) => `  ${nodeIds.get(node.id)}["${oneLine(node.label)}"]`;

  const lines = [`flowchart ${graph.direction}`];
  for (const group of graph.groups) {
    lines.push(`  subgraph ${groupIds.get(group.id)} ["${oneLine(group.label)}"]`);
    lines.push(...graph.nodes.filter((node) => node.group === group.id).map(line));
    lines.push('  end');
  }
  lines.push(...graph.nodes.filter((node) => !node.group || !groupIds.has(node.group)).map(line));
  for (const edge of graph.edges) {
    // A `|` would close the label early, and the parser keeps whatever follows as the target.
    const label = edge.label ? `|${oneLine(edge.label).replaceAll('|', '/')}|` : '';
    lines.push(`  ${nodeIds.get(edge.from)} ${EDGE_TOKEN[edge.kind ?? 'reference']}${label} ${nodeIds.get(edge.to)}`);
  }
  for (const node of graph.nodes) {
    if (node.ref) {
      // The directive's target is one token, so whitespace in a path is escaped as a URL would be.
      lines.push(`  %% ref ${nodeIds.get(node.id)} ${node.ref.trim().replace(/\s/g, '%20')}`);
    }
  }
  return lines.join('\n');
};
