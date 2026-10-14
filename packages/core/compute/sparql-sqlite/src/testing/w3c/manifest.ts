//
// Copyright 2026 DXOS.org
//

import { type OTerm, Parser, Store } from 'n3';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** Vendored copy of https://github.com/w3c/rdf-tests `sparql/` (query tests only). */
export const W3C_ROOT = fileURLToPath(new URL('./rdf-tests/', import.meta.url));

/** Official IRIs of the vendored trees: data and queries are resolved against these, as the results expect. */
const BASES: [local: string, official: string][] = [
  ['sparql10/', 'http://www.w3.org/2001/sw/DataAccess/tests/data-r2/'],
  ['sparql11/', 'http://www.w3.org/2009/sparql/docs/tests/data-sparql11/'],
];

const MF = 'http://www.w3.org/2001/sw/DataAccess/tests/test-manifest#';
const QT = 'http://www.w3.org/2001/sw/DataAccess/tests/test-query#';
const DAWGT = 'http://www.w3.org/2001/sw/DataAccess/tests/test-dawg#';
const RDF_TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';
const RDFS_LABEL = 'http://www.w3.org/2000/01/rdf-schema#label';

/** Top-level manifests of the vendored suites (each includes per-category manifests). */
const ROOT_MANIFESTS = [
  'sparql10/manifest-evaluation.ttl',
  'sparql10/manifest-syntax.ttl',
  'sparql11/manifest-sparql11-query.ttl',
];

export type W3cTestType = 'eval' | 'positiveSyntax' | 'negativeSyntax';

export type W3cTest = {
  /** Stable id: `<category>/<entry local name>`, e.g. `sparql11/aggregates/agg01`. */
  id: string;
  /** Directory of the test, e.g. `sparql11/aggregates`. */
  category: string;
  name: string;
  type: W3cTestType;
  /** Set when the harness deliberately does not run the test. */
  skip?: string;
  /** Local path and official IRI of the query file. */
  query: { path: string; iri: string };
  /** Default-graph data files. */
  data: { path: string; iri: string }[];
  /** Named-graph data files; `name` is the graph IRI. */
  graphData: { path: string; iri: string; name: string }[];
  /** Expected result file. */
  result?: { path: string; iri: string };
};

/** Maps an official test IRI to its vendored file. */
export const localPath = (iri: string): string => {
  for (const [local, official] of BASES) {
    if (iri.startsWith(official)) {
      return `${W3C_ROOT}${local}${iri.slice(official.length)}`;
    }
  }
  throw new Error(`no vendored file for ${iri}`);
};

const officialIri = (relative: string): string => {
  for (const [local, official] of BASES) {
    if (relative.startsWith(local)) {
      return `${official}${relative.slice(local.length)}`;
    }
  }
  throw new Error(`no official IRI for ${relative}`);
};

const fileRef = (term: { value: string }) => ({ path: localPath(term.value), iri: term.value });

/** Reads every test listed in the vendored manifests (following `mf:include`), in manifest order. */
export const loadW3cTests = (): W3cTest[] => {
  const tests: W3cTest[] = [];
  const visit = (manifestIri: string) => {
    const store = new Store(new Parser({ baseIRI: manifestIri }).parse(readFileSync(localPath(manifestIri), 'utf8')));
    const lists = store.extractLists();
    const listOf = (subject: string, predicate: string): Exclude<OTerm, string | null>[] =>
      store.getObjects(subject, predicate, null).flatMap((head) => lists[head.value] ?? []);
    const one = (subject: OTerm, predicate: string) => store.getObjects(subject, predicate, null)[0];

    for (const include of listOf(manifestIri, `${MF}include`)) {
      visit(include.value);
    }
    const category = localPath(manifestIri)
      .slice(W3C_ROOT.length)
      .replace(/\/[^/]+$/, '');
    for (const entry of listOf(manifestIri, `${MF}entries`)) {
      const type = one(entry, RDF_TYPE)?.value.slice(MF.length) ?? '';
      const name = one(entry, `${MF}name`)?.value ?? entry.value;
      const id = `${category}/${entry.value.replace(/^.*[#/]/, '')}`;
      const action = one(entry, `${MF}action`);
      const result = one(entry, `${MF}result`);
      const approval = one(entry, `${DAWGT}approval`)?.value.slice(DAWGT.length);
      if (!action) {
        continue;
      }
      const base = { id, category, name, data: [], graphData: [], result: result && fileRef(result) };
      if (type.startsWith('PositiveSyntaxTest') || type.startsWith('NegativeSyntaxTest')) {
        tests.push({
          ...base,
          type: type.startsWith('Positive') ? 'positiveSyntax' : 'negativeSyntax',
          query: fileRef(action),
        });
        continue;
      }
      const query = one(action, `${QT}query`);
      if (type !== 'QueryEvaluationTest' || !query) {
        continue;
      }
      tests.push({
        ...base,
        type: 'eval',
        skip: approval === 'NotApproved' ? 'not approved by the working group' : undefined,
        query: fileRef(query),
        data: store.getObjects(action, `${QT}data`, null).map(fileRef),
        graphData: store.getObjects(action, `${QT}graphData`, null).map((graph) => {
          // SPARQL 1.1 manifests may name the graph separately: [ qt:graph <file> ; rdfs:label "name" ].
          const file = graph.termType === 'BlankNode' ? one(graph, `${QT}graph`) : graph;
          if (!file) {
            throw new Error(`graphData without a file in ${id}`);
          }
          return { ...fileRef(file), name: one(graph, RDFS_LABEL)?.value ?? file.value };
        }),
      });
    }
  };
  for (const manifest of ROOT_MANIFESTS) {
    visit(officialIri(manifest));
  }
  return tests;
};
