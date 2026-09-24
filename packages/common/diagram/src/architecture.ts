//
// Copyright 2026 DXOS.org
//

//
// Architecture rules for a diagram's content: the software-engineering review rules the team applies
// to code (`.agents/projects/architecture-rules`), restated for what a diagram shows — components,
// the groups they belong to and who depends on whom. A decision model judges every rule in one call,
// so grading a diagram costs one request however many rules there are.
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import * as Decision from 'effect/unstable/ai/Decision';
import * as DecisionModel from 'effect/unstable/ai/DecisionModel';

import type * as Mermaid from './mermaid.ts';
import type * as Score from './score.ts';

/** What a diagram says, stripped of geometry: the input every rule is judged against. */
export const Content = Schema.Struct({
  title: Schema.optional(Schema.String),
  groups: Schema.Array(Schema.Struct({ id: Schema.String, label: Schema.String })),
  nodes: Schema.Array(
    Schema.Struct({ id: Schema.String, label: Schema.String, group: Schema.optional(Schema.String) }),
  ),
  edges: Schema.Array(
    Schema.Struct({
      from: Schema.String,
      to: Schema.String,
      label: Schema.optional(Schema.String),
    }).annotate({ description: '`from` depends on, calls or owns `to`.' }),
  ),
});
export type Content = Schema.Schema.Type<typeof Content>;

/** The content of a parsed mermaid graph. */
export const contentOf = (graph: Mermaid.MermaidGraph, title?: string): Content => ({
  ...(title ? { title } : {}),
  groups: graph.groups.map(({ id, label }) => ({ id, label })),
  nodes: graph.nodes.map(({ id, label, group }) => ({ id, label, ...(group ? { group } : {}) })),
  edges: graph.edges.map(({ from, to, label }) => ({ from, to, ...(label ? { label } : {}) })),
});

export type Rule = {
  /** Kebab-case, as the review rule it adapts is named. */
  id: string;
  /** Decision key: System One names questions by identifier. */
  key: string;
  description: string;
  /** The question, phrased so `true` means the diagram follows the rule. */
  instructions: string;
  criteria: { false: string; true: string };
};

const HOW_TO_READ =
  'The input is an architecture diagram: nodes are components, groups are layers or packages, and an edge ' +
  '`from → to` means `from` depends on, calls or owns `to`.';

const rule = (id: string, key: string, description: string, question: string, criteria: Rule['criteria']): Rule => ({
  id,
  key,
  description,
  instructions: `${HOW_TO_READ} ${question}`,
  criteria,
});

/**
 * The first batch of `architecture-rules`' recommended rules that a diagram can show, plus the
 * bounded-state pair `non-negotiables.mdl` already enforces on code.
 */
export const RULES: readonly Rule[] = [
  rule(
    'dependency-direction',
    'dependencyDirection',
    'Dependencies point from higher-level layers to foundational ones, never back up.',
    'Do all dependencies point one way, from higher-level or UI components towards foundational ones, with no ' +
      'foundational component depending on a higher-level one and no cycle between groups?',
    {
      true: 'Every edge points downward in the layering; groups form a one-way stack.',
      false: 'Some foundational component depends on a higher-level one, or two groups depend on each other.',
    },
  ),
  rule(
    'state-owned-once',
    'stateOwnedOnce',
    'Every piece of state has exactly one owner; others derive or subscribe.',
    'Does the diagram show a single owner for each piece of state (store, table, cache, registry), with other ' +
      'components reaching it through that owner rather than keeping mirrored copies or writing it directly?',
    {
      true: 'Each store has one owning component and everyone else goes through it.',
      false: 'A store is written by several components, or state is mirrored in parallel copies.',
    },
  ),
  rule(
    'one-mechanism-per-concern',
    'oneMechanismPerConcern',
    'One mechanism serves each concern; no parallel components doing the same job.',
    'Is each concern (transport, storage, scheduling, lookup, sync) served by one component, rather than two ' +
      'parallel components that do the same job side by side?',
    {
      true: 'Every concern has one mechanism.',
      false: 'Two components serve the same concern in parallel.',
    },
  ),
  rule(
    'no-pointless-indirection',
    'noPointlessIndirection',
    'Every node earns its place; no pass-through layer that only forwards to one other.',
    'Does every component do real work of its own, rather than being a pass-through with one incoming and one ' +
      'outgoing edge that only forwards calls?',
    {
      true: 'No node is a mere relay; each adds behavior, state or a boundary.',
      false: 'At least one node only forwards to a single other node and could be removed.',
    },
  ),
  rule(
    'public-surface-only',
    'publicSurfaceOnly',
    "Consumers depend on a group's public entry point, not on its internals.",
    'When an edge crosses from one group into another, does it land on the entry point or service that group ' +
      'exposes, rather than reaching past it into an internal component?',
    {
      true: 'Cross-group edges land on each group’s entry point.',
      false: 'Some edge from outside a group reaches an internal component directly.',
    },
  ),
  rule(
    'bounded-live-state',
    'boundedLiveState',
    'Long-lived collections show who bounds them and who evicts finished entries.',
    'For every long-lived collection the diagram shows (processes, invocations, queues, caches, indexes, records ' +
      'of finished work), does it also show the component that owns it and so can bound it and evict finished ' +
      'entries?',
    {
      true: 'Each long-lived collection has an owning component responsible for its limit and eviction.',
      false: 'A collection grows with no owner shown that could bound it or evict from it.',
    },
  ),
];

/** The decision definition for a set of rules: one probability per rule, answered in one call. */
export const definition = (rules: readonly Rule[] = RULES) =>
  Decision.make({
    input: Content,
    decisions: Object.fromEntries(
      rules.map(({ key, instructions, criteria }) => [key, Decision.probability({ instructions, criteria })]),
    ),
  });

/**
 * Every rule as a score, from one `DecisionModel` call: the probability that the diagram follows the
 * rule. A failed call scores every rule as an error rather than as 0, so an outage never reads as a
 * bad diagram.
 */
export const judge = (
  rules: readonly Rule[] = RULES,
): Score.Batch<{ readonly content: Content }, DecisionModel.DecisionModel> => {
  const decisions = definition(rules);
  return {
    entries: rules.map(({ id, description }) => ({ id, kind: 'architecture', description })),
    evaluate: ({ content }) =>
      DecisionModel.decide(decisions, { input: content }).pipe(
        Effect.map(({ answers }) =>
          rules.map(({ key }) => {
            const answer = answers[key];
            return answer ? { score: answer.probability } : { score: 0, error: 'No answer.' };
          }),
        ),
        Effect.catch((error) =>
          Effect.succeed(
            rules.map(() => ({ score: 0, error: error instanceof Error ? error.message : String(error) })),
          ),
        ),
      ),
  };
};
