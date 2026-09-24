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
  /** In [0, 1]: 0 is bad, 1 is good. Meaningless when `error` is set. */
  score: number;
  /** Why, in a line or two: the violations, or the raw measure behind a cost. */
  detail?: string;
  /** The scorer could not judge (e.g. its model was unreachable); left out of {@link overall}. */
  error?: string;
};

export type Entry = {
  id: string;
  kind: Kind;
  description: string;
};

/**
 * One judge of a subject — by default the layout. An effect, so a judge that asks something outside the
 * process can run late, be interrupted, and name what it needs in `R`.
 */
export type Scorer<S = Objective.Layout, R = never> = Entry & {
  evaluate: (subject: S) => Effect.Effect<Result, never, R>;
};

/** Several scores from one evaluation, in `entries` order: for a judge that answers many questions per call. */
export type Batch<S = Objective.Layout, R = never> = {
  entries: readonly Entry[];
  evaluate: (subject: S) => Effect.Effect<readonly Result[], never, R>;
};

export type Source<S = Objective.Layout, R = never> = Scorer<S, R> | Batch<S, R>;

export type Scored = Result & Entry;

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

const isBatch = <S, R>(source: Source<S, R>): source is Batch<S, R> => 'entries' in source;

/** Runs every source against one subject concurrently; results keep the sources' order, batches flattened. */
export const evaluate = <S, R>(sources: readonly Source<S, R>[], subject: S): Effect.Effect<Scored[], never, R> =>
  Effect.all(
    sources.map((source) =>
      isBatch(source)
        ? source
            .evaluate(subject)
            .pipe(Effect.map((results) => source.entries.map((entry, index) => ({ ...entry, ...results[index] }))))
        : source
            .evaluate(subject)
            .pipe(
              Effect.map((result) => [
                { id: source.id, kind: source.kind, description: source.description, ...result },
              ]),
            ),
    ),
    { concurrency: 'unbounded' },
  ).pipe(Effect.map((groups) => groups.flat()));

/**
 * One number for a set of scores: the worst constraint gates the mean of everything else, so a
 * layout that breaks a constraint scores 0 however good it otherwise is — the same precedence
 * `Objective.select` gives violations over cost — while every other kind contributes equally.
 */
export const overall = (all: readonly Pick<Scored, 'kind' | 'score' | 'error'>[]): number => {
  const scores = all.filter(({ error }) => error === undefined);
  const gate = Math.min(1, ...scores.filter(({ kind }) => kind === 'constraint').map(({ score }) => score));
  const rest = scores.filter(({ kind }) => kind !== 'constraint');
  const mean = rest.length ? rest.reduce((total, { score }) => total + score, 0) / rest.length : 1;
  return gate * mean;
};

const round = (value: number) => (Number.isInteger(value) ? `${value}` : value.toFixed(2));
