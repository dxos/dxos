//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { useEffect, useState } from 'react';

import * as EffectEx from '@dxos/effect/EffectEx';
import { type FactAnalytics, RDF } from '@dxos/pipeline-rdf';

//
// One question put to the store, with the answer that stands and the claims behind it. This is where an
// append-only store earns its keep: a correction hides the stale claim from the answer without deleting it, so
// "what do you think" and "why did you ever think otherwise" are both answerable from the same data.
//

/** The question: a subject and a predicate, which together name one thing the store may have an answer for. */
export type Belief = {
  /** Entity key of the subject. */
  readonly subject: string;
  /** Predicate, as a surface form the ontology resolves or an IRI. */
  readonly predicate: string;
  /** The question in words, for the heading. */
  readonly question: string;
};

export type BeliefClaim = {
  readonly fact: RDF.Fact;
  /** Whether the claim still stands, as the store resolved it — not re-derived here. */
  readonly standing: boolean;
  /** Why it no longer stands, where the history holds the link that withdrew it. */
  readonly status: RDF.Graph.Status;
};

export type BeliefState = {
  /** The claim that answers the question: the most certain of those still standing. */
  readonly answer?: BeliefClaim;
  /** Every claim ever made about this subject and predicate, newest first, standing or not. */
  readonly history: BeliefClaim[];
  readonly pending: boolean;
  readonly error?: string;
};

const EMPTY: BeliefState = { history: [], pending: true };

/** Most certain first, then most recent: the answer is the claim the store is most sure of today. */
const byConfidence = (left: RDF.Fact, right: RDF.Fact) =>
  (right.factuality.confidence ?? 0) - (left.factuality.confidence ?? 0) ||
  Date.parse(right.attribution.generatedAtTime) - Date.parse(left.attribution.generatedAtTime);

const byRecency = (left: BeliefClaim, right: BeliefClaim) =>
  Date.parse(right.fact.attribution.generatedAtTime) - Date.parse(left.fact.attribution.generatedAtTime);

const load = (analytics: FactAnalytics, belief: Belief) =>
  Effect.gen(function* () {
    const scope = { subjectEntity: belief.subject, predicate: belief.predicate } as const;
    const [history, current, statuses] = yield* Effect.all([
      analytics.facts(scope),
      analytics.facts({ ...scope, current: true }),
      // Read from the store, not derived from `history`: a withdrawal need not share the subject or predicate of
      // the claim it withdraws, so deriving it here would report the wrong reason — or none.
      analytics.statuses(),
    ]);

    const standing = new Set(current.map((fact) => fact.id));
    const claims = history
      .map((fact): BeliefClaim => {
        const isStanding = standing.has(fact.id);
        return {
          fact,
          standing: isStanding,
          status: isStanding ? 'active' : (statuses.get(RDF.Mapping.graphOf(fact)) ?? 'superseded'),
        };
      })
      .sort(byRecency);

    const [answer] = current.slice().sort(byConfidence);
    return {
      ...(answer ? { answer: claims.find((claim) => claim.fact.id === answer.id) } : {}),
      history: claims,
      pending: false,
    } satisfies BeliefState;
  });

/** The standing answer and the claims behind it, reloaded whenever `revision` says the store was written to. */
export const useBelief = (analytics: FactAnalytics, belief: Belief, revision = 0): BeliefState => {
  const [state, setState] = useState<BeliefState>(EMPTY);
  const { subject, predicate, question } = belief;

  useEffect(() => {
    let cancelled = false;
    setState((current) => ({ ...current, pending: true }));
    void EffectEx.runPromise(
      load(analytics, { subject, predicate, question }).pipe(
        Effect.catch((error) => Effect.succeed({ ...EMPTY, pending: false, error: error.message })),
      ),
    ).then((next) => {
      if (!cancelled) {
        setState(next);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [analytics, subject, predicate, question, revision]);

  return state;
};
