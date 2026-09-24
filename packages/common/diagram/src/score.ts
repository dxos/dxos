//
// Copyright 2026 DXOS.org
//

//
// Normalized scoring: every heuristic — an objective's constraints and cost terms, or any other
// judge of a layout — reports one score in [0, 1] (0 bad, 1 good), so heterogeneous scorers read
// as one list and combine into one number. `Objective` stays the engines' selector; this is the
// view of the same measurements a person (or a later judge) compares layouts by.
//

import * as Effect from 'effect/Effect';

import type * as Objective from './objective.ts';

/** What produced a score; open so a host can add its own kinds of judge alongside the built-in ones. */
export type Kind = 'constraint' | 'cost' | (string & {});

export type Result = {
  /** In [0, 1]: 0 is bad, 1 is good. */
  score: number;
  /** Why, in a line or two: the violations, or the raw measure behind a cost. */
  detail?: string;
};

export type Scorer = {
  id: string;
  kind: Kind;
  description: string;
  /** An effect, so a judge that asks something outside the process can run late and be interrupted. */
  evaluate: (layout: Objective.Layout) => Effect.Effect<Result>;
};

export type Scored = Result & Pick<Scorer, 'id' | 'kind' | 'description'>;

/**
 * Weighted cost at which a cost term scores 0.5: one crossing's worth (see `Objective.crossings`), so
 * "half marks" means "as bad as one crossing" on every term.
 */
export const HALF_COST = 3;

/** Maps a weighted cost in [0, ∞) onto (0, 1]: 1 at no cost, 0.5 at `half`, falling off hyperbolically. */
export const fromCost = (weighted: number, half: number = HALF_COST): number => 1 / (1 + Math.max(0, weighted) / half);

/** A hard requirement: 1 when it holds, 0 when anything violates it. */
export const constraintScorer = (constraint: Objective.Constraint): Scorer => ({
  id: constraint.id,
  kind: 'constraint',
  description: constraint.description,
  evaluate: (layout) =>
    Effect.sync(() => {
      const violations = constraint.violations(layout);
      return { score: violations.length ? 0 : 1, ...(violations.length ? { detail: violations.join('\n') } : {}) };
    }),
});

/** A soft preference: its weighted cost through {@link fromCost}. */
export const costScorer = (term: Objective.CostTerm, half: number = HALF_COST): Scorer => ({
  id: term.id,
  kind: 'cost',
  description: term.description,
  evaluate: (layout) =>
    Effect.sync(() => {
      const value = term.measure(layout);
      const weighted = value * term.weight;
      return { score: fromCost(weighted, half), detail: `${round(value)} × ${term.weight} = ${round(weighted)}` };
    }),
});

/** Every constraint and cost term of an objective, constraints first. */
export const fromObjective = (objective: Objective.Objective, half: number = HALF_COST): Scorer[] => [
  ...objective.constraints.map(constraintScorer),
  ...objective.costs.map((term) => costScorer(term, half)),
];

/** Runs every scorer against one layout concurrently; results keep the scorers' order. */
export const evaluate = (scorers: readonly Scorer[], layout: Objective.Layout): Effect.Effect<Scored[]> =>
  Effect.all(
    scorers.map(({ id, kind, description, evaluate }) =>
      evaluate(layout).pipe(Effect.map((result) => ({ id, kind, description, ...result }))),
    ),
    { concurrency: 'unbounded' },
  );

/**
 * One number for a set of scores: the worst constraint gates the mean of everything else, so a
 * layout that breaks a constraint scores 0 however good it otherwise is — the same precedence
 * `Objective.select` gives violations over cost — while every other kind contributes equally.
 */
export const overall = (scores: readonly Pick<Scored, 'kind' | 'score'>[]): number => {
  const gate = Math.min(1, ...scores.filter(({ kind }) => kind === 'constraint').map(({ score }) => score));
  const rest = scores.filter(({ kind }) => kind !== 'constraint');
  const mean = rest.length ? rest.reduce((total, { score }) => total + score, 0) / rest.length : 1;
  return gate * mean;
};

const round = (value: number) => (Number.isInteger(value) ? `${value}` : value.toFixed(2));
