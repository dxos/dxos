//
// Copyright 2026 DXOS.org
//
// @import-as-namespace
//

import * as Effect from 'effect/Effect';
import * as Result from 'effect/Result';
import * as Schema from 'effect/Schema';

import { Dsl, type Semantic } from '@dxos/diagram';

/**
 * What a `display.diagram` panel carries: plugin-illustrator's semantic diagram DSL (`.dx`) — the
 * `diagram`, `group`, `node` and `edge` statements `SemanticEngine` lays out. The log stores the
 * source as written, once it reads without errors, so the web UI compiles exactly what the model
 * wrote. Kept free of DOM, Node and framework code: the host, the web UI and its worker share it.
 */

/** Why a diagram cannot be drawn, worded for whoever wrote it: the model, or the user reading an old panel. */
export type Problem = { readonly message: string };

const problem = (message: string): Result.Result<never, Problem> => Result.fail({ message });

/** `line:column` of an offset, 1-based, as an editor shows it. */
const position = (text: string, offset: number): string => {
  const before = text.slice(0, offset).split('\n');
  return `${before.length}:${before[before.length - 1].length + 1}`;
};

/**
 * Reads a DSL source the way the engine will, failing on any error with its position so the model
 * can fix the line, and on a document with no `node` to draw. Warnings — a placement hint the
 * engine had to relax — still draw, so they pass.
 */
export const check = (source: string): Result.Result<string, Problem> => {
  const { diagram, problems } = Dsl.read(source);
  const errors = problems.filter((entry) => entry.severity === 'error');
  if (errors.length > 0) {
    return problem(
      `The diagram does not read:\n${errors.map((entry) => `  ${position(source, entry.from)} ${entry.message}`).join('\n')}`,
    );
  }
  if (!diagram || diagram.nodes.length === 0) {
    return problem('The diagram has no nodes: declare each box with `node <id> "Label"`.');
  }
  return Result.succeed(source);
};

/** Every box's `ref`, in declaration order: the IRIs and paths the diagram says it depicts. */
export const refs = (source: string): string[] =>
  (Dsl.read(source).diagram?.nodes ?? []).flatMap((node) => (node.ref ? [node.ref] : []));

/** An edge between two boxes that both name what they depict, by those refs. */
export type RefEdge = { readonly from: string; readonly to: string; readonly text: string };

/** The edges whose two ends both carry a `ref`, which is what lets an edge be checked against the index. */
export const refEdges = (source: string): RefEdge[] => {
  const diagram = Dsl.read(source).diagram;
  const refOf = new Map((diagram?.nodes ?? []).flatMap((node) => (node.ref ? [[node.id, node.ref]] : [])));
  return (diagram?.edges ?? []).flatMap((edge) => {
    const from = refOf.get(edge.from.node);
    const to = refOf.get(edge.to.node);
    return from && to ? [{ from, to, text: `${edge.from.node} -> ${edge.to.node}` }] : [];
  });
};

/** A box of the graph form `print` writes. */
export type Node = { readonly id: string; readonly label?: string; readonly group?: string; readonly ref?: string };

export type Edge = {
  readonly from: string;
  readonly to: string;
  readonly label?: string;
  /** A relationship word (`extends`, `owns`, `depends-on`, …); absent is a plain `->`. */
  readonly relation?: string;
};

/** A diagram as data, for the code that builds one from query results instead of writing the DSL. */
export type Graph = {
  readonly flow?: Semantic.Flow;
  /** Drop each plain edge a longer path already implies, which is most of a dependency graph's edges. */
  readonly reduce?: boolean;
  readonly groups?: readonly { readonly id: string; readonly label?: string }[];
  readonly nodes: readonly Node[];
  readonly edges?: readonly Edge[];
};

/**
 * The edges no longer path implies. Only plain edges are dropped: a labelled or typed edge says
 * something a path through other boxes does not.
 */
const transitiveReduction = (edges: readonly Edge[]): Edge[] => {
  const out = new Map<string, string[]>();
  for (const edge of edges) {
    out.set(edge.from, [...(out.get(edge.from) ?? []), edge.to]);
  }
  /** Whether `to` is reachable from `from` without taking the direct edge between them. */
  const implied = (from: string, to: string): boolean => {
    const seen = new Set<string>();
    const stack = (out.get(from) ?? []).filter((next) => next !== to);
    while (stack.length > 0) {
      const current = stack.pop();
      if (current === undefined || seen.has(current)) {
        continue;
      }
      if (current === to) {
        return true;
      }
      seen.add(current);
      stack.push(...(out.get(current) ?? []));
    }
    return false;
  };
  return edges.filter((edge) => edge.label || edge.relation || !implied(edge.from, edge.to));
};

/** Labels are drawn on one line, so a newline or a run of spaces would only cost width. */
const oneLine = (text: string): string => text.replace(/\s+/g, ' ').trim();

/**
 * The graph as DSL source, groups first with their members inside them, so the engine lays each
 * group out as one unit; a box named only by an edge is declared. Ids and labels are quoted
 * wherever the grammar needs it.
 */
export const print = ({
  flow,
  reduce = false,
  groups: declaredGroups = [],
  nodes: declared,
  edges: all = [],
}: Graph): string => {
  const edges = reduce ? transitiveReduction(all) : all;
  // The DSL rejects an edge to an undeclared box; a graph built from rows names some only in edges.
  const ids = new Set(declared.map((entry) => entry.id));
  const implied = [...new Set(edges.flatMap((edge) => [edge.from, edge.to]))].filter((id) => !ids.has(id));
  const nodes: Node[] = [...declared, ...implied.map((id) => ({ id }))];
  const node = (entry: Node, indent: string) =>
    [
      `${indent}node ${Dsl.formatId(entry.id)}`,
      ...(entry.label !== undefined && entry.label !== entry.id ? [Dsl.formatString(oneLine(entry.label))] : []),
      ...(entry.ref ? [`ref=${Dsl.formatString(entry.ref)}`] : []),
    ].join(' ');
  // Groups and boxes share one id namespace; a group named like a box is renamed rather than rejected.
  const boxes = new Set(nodes.map((entry) => entry.id));
  const groups = declaredGroups.map((group) =>
    boxes.has(group.id)
      ? { ...group, as: `group_${group.id}`, label: group.label ?? group.id }
      : { ...group, as: group.id },
  );
  const grouped = new Set(groups.map((group) => group.id));
  const lines = flow ? [`diagram flow=${flow}`] : [];
  for (const group of groups) {
    const members = nodes.filter((entry) => entry.group === group.id);
    if (members.length === 0) {
      continue;
    }
    const label = group.label !== undefined ? ` ${Dsl.formatString(oneLine(group.label))}` : '';
    lines.push(`group ${Dsl.formatId(group.as)}${label} {`, ...members.map((entry) => node(entry, '  ')), '}');
  }
  lines.push(...nodes.filter((entry) => !entry.group || !grouped.has(entry.group)).map((entry) => node(entry, '')));
  for (const edge of edges) {
    const label = edge.label ? ` ${Dsl.formatString(oneLine(edge.label))}` : '';
    lines.push(`edge ${Dsl.formatId(edge.from)} ${edge.relation ?? '->'} ${Dsl.formatId(edge.to)}${label}`);
  }
  return lines.join('\n');
};

/**
 * A graph handed over as a value — by the sandbox, from code that builds a diagram out of query
 * rows — or stored by `display.diagram` before it took the DSL, whose `direction` and `kind` it
 * still reads.
 */
const GraphValue = Schema.Struct({
  flow: Schema.optional(Schema.Literals(['down', 'up', 'right', 'left'])),
  reduce: Schema.optional(Schema.Boolean),
  direction: Schema.optional(Schema.Literals(['TB', 'LR', 'BT', 'RL'])),
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
        relation: Schema.optional(Schema.String),
        kind: Schema.optional(Schema.String),
      }),
    ),
  ),
});

const FLOWS: Record<string, Semantic.Flow> = { TB: 'down', LR: 'right', BT: 'up', RL: 'left' };

/** The stored graph's arrow kinds, as the relationship each one drew. */
const RELATIONS: Record<string, string> = {
  creates: 'depends-on',
  inheritance: 'extends',
  implements: 'implements',
  hasMany: 'one-to-many',
  contains: 'owns',
};

const decodeGraph = Schema.decodeUnknownResult(GraphValue);

/** A graph value as checked DSL source. */
export const fromValue = (value: unknown): Result.Result<string, Problem> => {
  const decoded = decodeGraph(value);
  if (Result.isFailure(decoded)) {
    return problem(`The diagram is not a valid { nodes, edges, groups } graph: ${decoded.failure.message}`);
  }
  const { flow, direction, reduce, groups, nodes, edges } = decoded.success;
  return check(
    print({
      flow: flow ?? (direction && FLOWS[direction]),
      reduce,
      groups,
      nodes,
      edges: edges?.map(({ kind, relation, ...edge }) => {
        const word = relation ?? (kind ? RELATIONS[kind] : undefined);
        return word ? { ...edge, relation: word } : edge;
      }),
    }),
  );
};

/**
 * A panel's content as checked DSL source: what `display.diagram` stores, and what a panel draws.
 * Content is DSL, or a graph as JSON; text that was a mermaid flowchart is named as such rather
 * than reported as a dozen DSL errors.
 */
export const read = (content: string): Result.Result<string, Problem> => {
  if (content.trimStart().startsWith('{')) {
    let value: unknown;
    try {
      value = JSON.parse(content);
    } catch {
      return problem('The diagram is neither DSL source nor a JSON graph.');
    }
    return fromValue(value);
  }
  if (/^\s*(?:%%.*\n\s*)*(?:flowchart|graph)\b/.test(content)) {
    return problem('This diagram is mermaid, which code-index no longer draws; write the diagram DSL instead.');
  }
  return check(content);
};

/** What a `display.diagram` panel stores for `content`: its checked DSL source. */
export const stored = (content: string): Effect.Effect<string, Problem> => Effect.fromResult(read(content));
