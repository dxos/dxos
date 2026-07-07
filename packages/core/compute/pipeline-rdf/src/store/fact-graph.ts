//
// Copyright 2026 DXOS.org
//

import { type Fact, type Term } from '../types';

/**
 * Read abstraction the graph builder traverses: facts in which an entity appears as **subject or
 * object**. Decoupled from the store so the builder stays pure and unit-testable; back it with
 * `FactStore.query({ entity })` results or {@link factSourceFromFacts} over an in-memory set.
 */
export type FactSource = {
  readonly factsForEntity: (entityId: string) => readonly Fact[];
};

export type FactGraphNode = {
  /** Stable node key (entity id, or `literal:<value>` for literal terms). */
  readonly id: string;
  /** Display label (entity surface form / literal value). */
  readonly label: string;
};

export type FactGraphEdge = {
  /** The source fact's id. */
  readonly id: string;
  readonly source: string;
  readonly target: string;
  /** Predicate (verb phrase). */
  readonly label: string;
};

export type FactGraph = {
  readonly nodes: FactGraphNode[];
  readonly edges: FactGraphEdge[];
};

export type BuildFactGraphOptions = {
  /** Maximum hops (edges) from the root entity to expand. Default 2. */
  readonly depth?: number;
};

const termKey = (term: Term): string => ('entity' in term ? term.entity : `literal:${term.literal}`);
const termNode = (term: Term): FactGraphNode =>
  'entity' in term
    ? { id: term.entity, label: term.label ?? term.entity }
    : { id: `literal:${term.literal}`, label: term.literal };

/**
 * Build a graph by exploring outward from a root entity over a {@link FactSource}, up to `depth` hops
 * in either direction (a fact `a -p-> b` is reached from both `a` and `b`). Nodes are entities (and
 * literal leaves); edges are facts labeled by predicate. An entity with no facts yields an empty
 * graph. Cycles and shared nodes are visited once. Pure and deterministic.
 */
export const buildFactGraph = (
  root: string,
  source: FactSource,
  { depth = 2 }: BuildFactGraphOptions = {},
): FactGraph => {
  const nodes = new Map<string, FactGraphNode>();
  const edges = new Map<string, FactGraphEdge>();
  const distance = new Map<string, number>([[root, 0]]);
  const queue: string[] = [root];

  while (queue.length > 0) {
    const entityId = queue.shift()!;
    const hops = distance.get(entityId)!;
    if (hops >= depth) {
      continue; // Boundary node: keep it, but don't expand further.
    }
    for (const fact of source.factsForEntity(entityId)) {
      const { subject, object, predicate } = fact.assertion;
      const subjectKey = termKey(subject);
      const objectKey = termKey(object);
      nodes.set(subjectKey, termNode(subject));
      nodes.set(objectKey, termNode(object));
      edges.set(fact.id, { id: fact.id, source: subjectKey, target: objectKey, label: predicate });
      // Only entity terms expand (literals are leaves); enqueue each neighbour once.
      for (const [term, key] of [
        [subject, subjectKey],
        [object, objectKey],
      ] as const) {
        if ('entity' in term && !distance.has(key)) {
          distance.set(key, hops + 1);
          queue.push(key);
        }
      }
    }
  }

  return { nodes: [...nodes.values()], edges: [...edges.values()] };
};

/** In-memory {@link FactSource}: indexes a fact set by the entity ids appearing as subject or object. */
export const factSourceFromFacts = (facts: readonly Fact[]): FactSource => {
  const byEntity = new Map<string, Fact[]>();
  const add = (term: Term, fact: Fact) => {
    if ('entity' in term) {
      const list = byEntity.get(term.entity) ?? [];
      list.push(fact);
      byEntity.set(term.entity, list);
    }
  };
  for (const fact of facts) {
    add(fact.assertion.subject, fact);
    // Avoid double-listing a fact whose subject and object are the same entity.
    if (termKey(fact.assertion.object) !== termKey(fact.assertion.subject)) {
      add(fact.assertion.object, fact);
    }
  }
  return { factsForEntity: (entityId) => byEntity.get(entityId) ?? [] };
};
