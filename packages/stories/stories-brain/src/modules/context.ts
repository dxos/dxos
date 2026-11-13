//
// Copyright 2026 DXOS.org
//

import { createContext, useContext } from 'react';

import { RDF } from '@dxos/pipeline-rdf';

/**
 * The only state genuinely shared across the Facts-story modules: the currently-displayed facts (a
 * view — a crawl/file-load produces the full set, a SPARQL run a filtered subset) and the selected
 * entity and predicate. The last SPARQL result scopes the views too. The `FactStore` itself (persistence) is Brain's per-space registry; this context is the
 * cross-module display/selection the {@link ModuleContainer} surfaces read and write.
 */
export type FactsStoryState = {
  facts: RDF.Fact[];
  setFacts: (facts: RDF.Fact[]) => void;
  /** The selected entity slug scoping the viewer, or undefined for all. */
  selected: string | undefined;
  setSelected: (selected: string | undefined) => void;
  /** The predicate scoping the viewer, or undefined for all. */
  predicate: PredicateFilter | undefined;
  setPredicate: (predicate: PredicateFilter | undefined) => void;
  /** What the last SPARQL run bound, scoping the facts and entities views; undefined for everything. */
  scope: QueryScope | undefined;
  setScope: (scope: QueryScope | undefined) => void;
};

/** The terms a SPARQL result binds, which the views keep only what they touch of. */
export type QueryScope = {
  /**
   * The statement graphs it binds (`?g`); when any, they scope exactly, since its other terms (a `?p` beside `?g`)
   * would otherwise pull in every statement that shares them.
   */
  graphs: ReadonlySet<string>;
  /** The IRIs it binds outside `?g`. */
  iris: ReadonlySet<string>;
  /** The literal values it binds. */
  literals: ReadonlySet<string>;
};

/** A predicate the facts view is scoped to: its IRI, and every IRI a fact may state it with (its equivalents). */
export type PredicateFilter = {
  iri: string;
  iris: ReadonlySet<string>;
};

/** Whether a fact states the filter's predicate (or one equivalent to it). */
export const matchesPredicate = (fact: RDF.Fact, predicate: PredicateFilter): boolean =>
  predicate.iris.has(RDF.Mapping.predicateOf(fact));

export const FactsStoryContext = createContext<FactsStoryState | undefined>(undefined);

/** Shared facts-story view state; throws if used outside the story provider. */
export const useFactsStory = (): FactsStoryState => {
  const context = useContext(FactsStoryContext);
  if (!context) {
    throw new Error('useFactsStory must be used within a FactsStoryContext provider');
  }
  return context;
};

/** The IRI a fact's term is stored under in its graph; a literal subject is stored as the entity it names. */
const termIri = (term: RDF.Term, graph: string, position: 'subject' | 'object'): string | undefined =>
  term.kind === 'entity'
    ? RDF.Vocab.entityNode(term.entity, graph).value
    : position === 'subject'
      ? RDF.Vocab.localEntityIri(graph, term.literal).value
      : undefined;

/** Whether a fact's object is a literal the result binds. */
const bindsObjectLiteral = (fact: RDF.Fact, scope: QueryScope): boolean =>
  fact.assertion.object.kind === 'literal' && scope.literals.has(fact.assertion.object.literal);

/** Whether a SPARQL result touches a fact: it binds the fact's graph, else its subject, object or predicate. */
export const factInScope = (fact: RDF.Fact, scope: QueryScope): boolean => {
  const graph = RDF.Mapping.graphOf(fact);
  if (scope.graphs.size > 0) {
    return scope.graphs.has(graph);
  }
  const subject = termIri(fact.assertion.subject, graph, 'subject');
  const object = termIri(fact.assertion.object, graph, 'object');
  return (
    scope.iris.has(graph) ||
    (subject !== undefined && scope.iris.has(subject)) ||
    (object !== undefined && scope.iris.has(object)) ||
    bindsObjectLiteral(fact, scope) ||
    scope.iris.has(RDF.Mapping.predicateOf(fact))
  );
};

/**
 * The entities (by slug) a SPARQL result touches: those of every graph it binds, else those it binds directly and the
 * subjects of the facts whose literal object it binds.
 */
export const entitiesInScope = (facts: readonly RDF.Fact[], scope: QueryScope): Set<string> => {
  const bindsGraphs = scope.graphs.size > 0;
  const entities = new Set<string>();
  for (const fact of facts) {
    const graph = RDF.Mapping.graphOf(fact);
    const whole = bindsGraphs && scope.graphs.has(graph);
    const literalObject = !bindsGraphs && bindsObjectLiteral(fact, scope);
    for (const [term, position] of [
      [fact.assertion.subject, 'subject'],
      [fact.assertion.object, 'object'],
    ] as const) {
      const iri = termIri(term, graph, position);
      const bound =
        !bindsGraphs && ((iri !== undefined && scope.iris.has(iri)) || (literalObject && position === 'subject'));
      if (term.kind === 'entity' && (whole || bound)) {
        entities.add(term.entity);
      }
    }
  }
  return entities;
};
