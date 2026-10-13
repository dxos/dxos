//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { Writer } from 'n3';

import { hashText } from '../internal/stages/reconcile.ts';
import { type Fact } from './Fact.ts';
import * as Mapping from './Mapping.ts';
import * as Ontology from './Ontology.ts';
import * as Vocab from './Vocab.ts';

/** Everything a graph states once for all its statements: facts that differ in any of it need separate graphs. */
const provenanceKey = (fact: Fact): string =>
  JSON.stringify([
    fact.attribution.source,
    fact.attribution.agent,
    fact.attribution.agentLabel,
    fact.attribution.generatedAtTime,
    fact.attribution.wasDerivedFrom,
    fact.attribution.span,
    fact.assertion.quote,
    fact.assertion.validFrom,
    fact.assertion.validTo,
    fact.factuality,
    fact.illocution,
    fact.recordedAt,
    fact.extractor,
    fact.sourceHash,
    fact.pass,
    fact.kind,
    fact.origin,
    fact.supersedes,
    fact.retracts,
  ]);

export type AssignOptions = {
  /** Names the graph for a fact; facts given the same name and provenance share a graph. Defaults to its source. */
  readonly name?: (fact: Fact) => string;
  readonly ontology?: Ontology.Ontology;
};

/**
 * Puts facts into named graphs: facts that share their provenance (source, speaker, time, quote, factuality,
 * extraction pass, …) share a graph, and a fact that differs in any of it starts another. A fact that already names
 * a graph keeps it. Each fact gets its predicate IRI, and the id it will have once stored.
 */
export const assign = (facts: readonly Fact[], { name, ontology = Ontology.DEFAULT }: AssignOptions = {}): Fact[] =>
  facts.map((fact) => {
    const label = name?.(fact) ?? fact.attribution.source;
    const graph = fact.graph ?? Vocab.graphIri(`${hashText(label)}-${hashText(provenanceKey(fact))}`).value;
    const placed: Fact = {
      ...fact,
      graph,
      assertion: { ...fact.assertion, predicateIri: Mapping.predicateOf(fact, ontology) },
    };
    return { ...placed, id: Mapping.idInGraph(placed, graph, ontology) };
  });

/** Whether a graph still holds: another graph can replace it (`supersedes`) or withdraw it (`retracts`). */
export type Status = 'active' | 'superseded' | 'retracted';

/** The status of every graph the facts mention, by graph IRI. */
export const status = (facts: readonly Fact[]): Map<string, Status> => {
  const statuses = new Map<string, Status>(facts.map((fact) => [Mapping.graphOf(fact), 'active']));
  for (const fact of facts) {
    for (const superseded of fact.supersedes ?? []) {
      if (statuses.get(superseded) !== 'retracted') {
        statuses.set(superseded, 'superseded');
      }
    }
  }
  for (const fact of facts) {
    for (const retracted of fact.retracts ?? []) {
      statuses.set(retracted, 'retracted');
    }
  }
  return statuses;
};

/** Prefixes TriG output abbreviates. */
export const PREFIXES: Readonly<Record<string, string>> = {
  dx: Vocab.DX,
  sx: Vocab.SX,
  prov: Vocab.PROV,
  rdf: Vocab.RDF,
  rdfs: Vocab.RDFS,
  entity: Vocab.ENTITY,
  fact: Vocab.FACT,
  graph: Vocab.GRAPH,
};

/** The facts as TriG: each graph's statements, then its provenance. */
export const toTriG = (facts: readonly Fact[], ontology: Ontology.Ontology = Ontology.DEFAULT): string => {
  const writer = new Writer({ format: 'application/trig', prefixes: { ...PREFIXES } });
  const seen = new Set<string>();
  for (const fact of facts) {
    for (const quad of Mapping.factToTriples(fact, ontology)) {
      const key = `${quad.subject.value} ${quad.predicate.value} ${quad.object.termType}:${quad.object.value} ${quad.graph.value}`;
      if (!seen.has(key)) {
        seen.add(key);
        writer.addQuad(quad);
      }
    }
  }
  let output = '';
  writer.end((error, result: string) => {
    if (error) {
      throw error;
    }
    output = result;
  });
  return output;
};
