//
// Copyright 2026 DXOS.org
//

//
// The layout objective: how heuristics are expressed. A heuristic is either a CONSTRAINT (hard —
// a layout that violates it is not acceptable) or a COST TERM (soft — weighted, minimized). Both
// are evaluated over the emitted scene through `Diagnostics`, so the objective that picks a layout
// and the report that grades one are the same measurements. Engines and rules are candidate
// generators; the objective is the judge. See `docs/DESIGN.md`.
//

import type * as Diagnostics from './diagnostics';
import type * as Scene from './scene';
import { GRID } from './uml-grid';

/** A candidate layout: the scene plus its analysis. */
export type Layout = {
  objects: readonly Scene.WorldObject[];
  report: Diagnostics.Report;
};

/** Hard requirement; `violations` names each way the layout breaks it, empty when it holds. */
export type Constraint = {
  id: string;
  description: string;
  violations: (layout: Layout) => readonly string[];
};

/** Soft preference; `measure` is in the term's natural unit and `weight` converts it to cost. */
export type CostTerm = {
  id: string;
  description: string;
  weight: number;
  measure: (layout: Layout) => number;
};

export type Objective = {
  constraints: readonly Constraint[];
  costs: readonly CostTerm[];
};

export type Evaluation = {
  violations: readonly { constraint: string; message: string }[];
  /** Weighted sum of the cost terms. */
  cost: number;
  terms: readonly { id: string; value: number; weighted: number }[];
};

export const evaluate = (objective: Objective, layout: Layout): Evaluation => {
  const violations = objective.constraints.flatMap((constraint) =>
    constraint.violations(layout).map((message) => ({ constraint: constraint.id, message })),
  );
  const terms = objective.costs.map((term) => {
    const value = term.measure(layout);
    return { id: term.id, value, weighted: value * term.weight };
  });
  return { violations, cost: terms.reduce((total, term) => total + term.weighted, 0), terms };
};

export type Ranked<T> = { candidate: T; evaluation: Evaluation };

/**
 * Picks the best candidate: fewest constraint violations first (so an infeasible set still yields
 * the least-bad layout rather than nothing), then lowest cost. Stable on ties, so the generator's
 * own order breaks them.
 */
export const select = <T extends { layout: Layout }>(
  objective: Objective,
  candidates: readonly T[],
): { chosen: Ranked<T>; ranked: readonly Ranked<T>[] } => {
  const ranked = candidates
    .map((candidate) => ({ candidate, evaluation: evaluate(objective, candidate.layout) }))
    .sort(
      (left, right) =>
        left.evaluation.violations.length - right.evaluation.violations.length ||
        left.evaluation.cost - right.evaluation.cost,
    );
  return { chosen: ranked[0], ranked };
};

//
// Built-in constraints and cost terms. Weights are in "one crossing ≈ three bends" units; the
// corpus snapshots are where a weight change shows its consequences.
//

/** Every `error` diagnostic is a violation: overlaps, routes through nodes, labels that do not fit. */
export const noHardDefects: Constraint = {
  id: 'no-hard-defects',
  description: 'No node overlaps, no connector through a node, every label fits its shape.',
  violations: ({ report }) =>
    report.diagnostics.filter(({ severity }) => severity === 'error').map(({ message }) => message),
};

/** Containers keep at least `gap` between them, so packages read as separate. */
export const framesApart = (gap: number = GRID): Constraint => ({
  id: 'frames-apart',
  description: `Frames are at least ${gap} apart.`,
  violations: ({ report }) =>
    report.metrics.containers >= 2 && report.metrics.frameGapMin < gap
      ? [`Frames are ${report.metrics.frameGapMin} apart; at least ${gap} required.`]
      : [],
});

export const crossings: CostTerm = {
  id: 'crossings',
  description: 'Connector pairs that cross.',
  weight: 3,
  measure: ({ report }) => report.metrics.crossings,
};

export const bends: CostTerm = {
  id: 'bends',
  description: 'Turns taken by connectors.',
  weight: 1,
  measure: ({ report }) => report.metrics.bends,
};

/** Uneven gutters between frames, in grid units. */
export const unevenFrameGaps: CostTerm = {
  id: 'uneven-frame-gaps',
  description: 'Spread of the gaps between neighbouring frames.',
  weight: 2,
  measure: ({ report }) => report.metrics.frameGapSpread / GRID,
};

/** Bounding perimeter in grid units; a light preference for the tighter of otherwise-equal layouts. */
export const compactness: CostTerm = {
  id: 'compactness',
  description: 'Bounding width + height.',
  weight: 0.05,
  measure: ({ report }) => (report.metrics.width + report.metrics.height) / GRID,
};

export const DEFAULT: Objective = {
  constraints: [noHardDefects, framesApart()],
  costs: [crossings, bends, unevenFrameGaps, compactness],
};
