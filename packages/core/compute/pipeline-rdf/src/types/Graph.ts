//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { type Quad, Writer } from 'n3';

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
 * extraction pass, ...) share a graph, and a fact that differs in any of it starts another. A fact that already names
 * a graph keeps it. Each fact gets its predicate IRI, and the id it will have once stored.
 */
export const assign = (facts: readonly Fact[], { name, ontology = Ontology.DEFAULT }: AssignOptions = {}): Fact[] =>
  facts.map((fact) => {
    const label = name?.(fact) ?? fact.attribution.source;
    const key = provenanceKey(fact);
    // Two independent 32-bit hashes: every memory an agent records shares one label, so 32 bits would collide.
    const graph = fact.graph ?? Vocab.graphIri(`${hashText(label)}-${hashText(key)}${hashText(`\u0000${key}`)}`).value;
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
  owl: Vocab.OWL,
  xsd: Vocab.XSD,
  skos: Vocab.SKOS,
  dcterms: Vocab.DCTERMS,
  schema: Vocab.SCHEMA,
  foaf: Vocab.FOAF,
  org: Vocab.ORG,
  entity: Vocab.ENTITY,
  fact: Vocab.FACT,
  graph: Vocab.GRAPH,
};

const write = (quads: Iterable<Quad>, prefixes: Record<string, string>): string => {
  const writer = new Writer({ format: 'application/trig', prefixes });
  const seen = new Set<string>();
  for (const quad of quads) {
    const key = `${quad.subject.value} ${quad.predicate.value} ${quad.object.termType}:${quad.object.value} ${quad.graph.value}`;
    if (!seen.has(key)) {
      seen.add(key);
      writer.addQuad(quad);
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

/**
 * The facts as TriG: each graph's statements, then its provenance. The brain's namespace reads as `brain:`, and the
 * entities local to each graph as `g1:`, `g2:`, ... so a graph-local entity is visibly not a shared one.
 */
export const toTriG = (facts: readonly Fact[], ontology: Ontology.Ontology = Ontology.DEFAULT): string => {
  const quads = facts.flatMap((fact) => Mapping.factToTriples(fact, ontology));
  const graphs = [...new Set(quads.flatMap((quad) => (quad.graph.termType === 'NamedNode' ? [quad.graph.value] : [])))];
  const locals = graphs.filter(
    (graph) =>
      graph !== Vocab.ONTOLOGY_GRAPH &&
      quads.some((quad) => quad.subject.value.startsWith(`${graph}#`) || quad.object.value.startsWith(`${graph}#`)),
  );
  const usesBrain = quads.some((quad) =>
    [quad.subject, quad.predicate, quad.object].some((term) => term.value.startsWith(ontology.namespace)),
  );
  return write(quads, {
    ...PREFIXES,
    ...(usesBrain ? { brain: ontology.namespace } : {}),
    ...Object.fromEntries(locals.map((graph, index) => [`g${index + 1}`, `${graph}#`])),
  });
};

/** The ontology's predicates as TriG: each an `rdf:Property` described in the ontology graph. */
export const ontologyToTriG = (ontology: Ontology.Ontology): string =>
  write(Ontology.ontologyQuads(ontology), { ...PREFIXES, brain: ontology.namespace });

/**
 * The predicates the facts use that the ontology does not define, as entries minted in its namespace, so the next
 * extraction can reuse them; the first quote that used one is kept as its example.
 */
export const mintedPredicates = (
  facts: readonly Fact[],
  ontology: Ontology.Ontology = Ontology.DEFAULT,
): Ontology.Entry[] => {
  const minted = new Map<string, Ontology.Entry>();
  for (const fact of facts) {
    const iri = Mapping.predicateOf(fact, ontology);
    if (ontology.get(iri) || minted.has(iri)) {
      continue;
    }
    minted.set(iri, {
      iri,
      name: Ontology.key(fact.assertion.predicate),
      label: fact.assertion.predicate,
      ...(fact.assertion.predicateDescription ? { description: fact.assertion.predicateDescription } : {}),
      ...(Vocab.brainNamespaceOf(iri) ? { definedBy: Vocab.brainNamespaceOf(iri) } : {}),
      created: fact.recordedAt,
      creator: `${fact.extractor.id}/${fact.extractor.model}`,
      ...(fact.assertion.quote ? { example: fact.assertion.quote } : {}),
    });
  }
  return [...minted.values()];
};
