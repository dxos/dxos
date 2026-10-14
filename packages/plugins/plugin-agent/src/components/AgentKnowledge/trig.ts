//
// Copyright 2026 DXOS.org
//

import { RDF } from '@dxos/pipeline-rdf';

/** The ontology namespace the proposed predicates and classes live in. */
const DX = 'https://dxos.org/ontology/';
/** Where graphs minted for an extraction are named. */
const GRAPH = 'https://dxos.org/semantic/graph/';

const PREFIXES: readonly (readonly [prefix: string, iri: string])[] = [
  ['dx', DX],
  ['sx', RDF.Vocab.SX],
  ['prov', RDF.Vocab.PROV],
  ['rdf', 'http://www.w3.org/1999/02/22-rdf-syntax-ns#'],
  ['rdfs', 'http://www.w3.org/2000/01/rdf-schema#'],
  ['xsd', 'http://www.w3.org/2001/XMLSchema#'],
];

export type NamedGraphOptions = {
  /** Real IRIs for the entities the extractor could resolve (an ECHO object, `mailto:`, a URL), by entity id. */
  entities?: Readonly<Record<string, string>>;
  /** Ontology local names (`hasRole`) for predicates, keyed by the normalized predicate (`RDF.Predicate.normalize`). */
  predicates?: Readonly<Record<string, string>>;
};

/** `works at` → `workAt`: the fallback local name when the ontology has no entry for a predicate. */
const camelCase = (text: string): string =>
  text
    .split(/[^a-zA-Z0-9]+/)
    .filter((word) => word.length > 0)
    .map((word, index) => (index === 0 ? word.toLowerCase() : word[0].toUpperCase() + word.slice(1).toLowerCase()))
    .join('');

/** A slug safe to use as a prefixed local name. */
const slug = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const quote = (value: string): string => JSON.stringify(value);

/** Statements that share all of these go in one graph; any difference starts another. */
const provenanceKey = (fact: RDF.Fact): string =>
  JSON.stringify([
    fact.attribution.source,
    fact.attribution.agent,
    fact.attribution.generatedAtTime,
    fact.assertion.quote,
    fact.factuality.value,
    fact.factuality.polarity,
    fact.extractor.id,
    fact.extractor.version,
    fact.sourceHash,
    fact.pass,
  ]);

/** `iri` is the graph's namespace: the graph itself is `<prefix>:graph`, and the entities minted in it share the prefix. */
type Graph = { prefix: string; iri: string; facts: RDF.Fact[] };

/**
 * The facts in the form `docs/QUESTIONS.md` §1 proposes, as TriG: real triples inside named graphs, with the provenance
 * stated once per graph, ontology predicates, and entities as real IRIs where known — otherwise scoped to their graph.
 * A mock-up for review, built from the stored facts; the store does not write this form.
 */
export const formatNamedGraphs = (facts: readonly RDF.Fact[], options: NamedGraphOptions = {}): string => {
  const graphs = new Map<string, Graph>();
  for (const fact of facts) {
    const key = provenanceKey(fact);
    let graph = graphs.get(key);
    if (!graph) {
      const name = `${slug(fact.sourceHash) || 'graph'}-${graphs.size + 1}`;
      graph = { prefix: `g${graphs.size + 1}`, iri: `${GRAPH}${name}/`, facts: [] };
      graphs.set(key, graph);
    }
    graph.facts.push(fact);
  }

  // Predicate local name → the surface forms the extractor used for it, which become its synonyms.
  const predicates = new Map<string, Set<string>>();
  const predicateName = (predicate: string): string => {
    const normalized = RDF.Predicate.normalize(predicate);
    const name = options.predicates?.[normalized] ?? (camelCase(normalized) || 'relatedTo');
    predicates.set(name, (predicates.get(name) ?? new Set()).add(predicate));
    return `dx:${name}`;
  };

  const blocks = [...graphs.values()].map((graph) => {
    // Entities with no real IRI, minted in this graph, each described once.
    const scoped = new Map<string, string | undefined>();
    const term = (value: RDF.Term): string => {
      if (value.kind === 'literal') {
        return quote(value.literal);
      }
      const iri = options.entities?.[value.entity];
      if (iri) {
        return `<${iri}>`;
      }
      const local = slug(value.entity) || 'entity';
      scoped.set(local, scoped.get(local) ?? value.label);
      return `${graph.prefix}:${local}`;
    };

    const statements = graph.facts.map(
      ({ assertion }) =>
        `  ${term(assertion.subject)} ${predicateName(assertion.predicate)} ${term(assertion.object)} .`,
    );
    const minted = [...scoped].map(([local, label]) =>
      label ? `  ${graph.prefix}:${local} rdfs:label ${quote(label)} .` : `  ${graph.prefix}:${local} a dx:Entity .`,
    );

    const [first] = graph.facts;
    const agent = (id: string): string => {
      const iri = options.entities?.[id];
      return iri ? `<${iri}>` : quote(id);
    };
    const provenance = [
      `prov:wasDerivedFrom <${first.attribution.source}>`,
      first.attribution.agent ? `prov:wasAttributedTo ${agent(first.attribution.agent)}` : undefined,
      `prov:generatedAtTime ${quote(first.attribution.generatedAtTime)}^^xsd:dateTime`,
      `sx:recordedAt ${quote(first.recordedAt)}^^xsd:dateTime`,
      `sx:factuality ${quote(first.factuality.value)}`,
      `sx:polarity ${quote(first.factuality.polarity)}`,
      first.assertion.quote ? `sx:quote ${quote(first.assertion.quote)}` : undefined,
      `sx:sourceHash ${quote(first.sourceHash)}`,
      `sx:extractor <https://dxos.org/semantic/extractor/${slug(first.extractor.id)}/${first.extractor.version}>`,
    ].filter((line): line is string => line !== undefined);

    return [
      `${graph.prefix}:graph {`,
      ...statements,
      ...minted,
      '}',
      '',
      `${graph.prefix}:graph`,
      ...provenance.map((line, index) => `  ${line} ${index === provenance.length - 1 ? '.' : ';'}`),
    ].join('\n');
  });

  const ontology = [...predicates].map(([name, forms]) =>
    [
      `dx:${name} a rdf:Property ;`,
      `  rdfs:label ${quote(RDF.Predicate.label(name))} ;`,
      `  sx:synonym ${[...forms].map(quote).join(', ')} .`,
    ].join('\n'),
  );

  const prefixes = [
    ...PREFIXES.map(([prefix, iri]) => `@prefix ${prefix}: <${iri}> .`),
    ...[...graphs.values()].map(({ prefix, iri }) => `@prefix ${prefix}: <${iri}> .`),
  ];

  return [prefixes.join('\n'), ...blocks, ...ontology].join('\n\n');
};
