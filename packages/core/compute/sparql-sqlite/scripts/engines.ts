//
// Copyright 2026 DXOS.org
//

import { QueryEngine } from '@comunica/query-sparql-rdfjs';
import { DataFactory, Store as N3Store } from 'n3';
import * as oxigraph from 'oxigraph';

import { type Quad, type Row, type Term } from '../src/index.ts';
import { type ResultSet, type W3cEngine, fromRdfjs } from '../src/testing/w3c/index.ts';

/** Reference engines for the comparison scripts (not part of the package or its CI suite). */

const toOxigraph = (term: Term) => {
  switch (term.termType) {
    case 'NamedNode':
      return oxigraph.namedNode(term.value);
    case 'BlankNode':
      return oxigraph.blankNode(term.value);
    case 'Literal':
      return term.language
        ? oxigraph.literal(term.value, term.language)
        : oxigraph.literal(term.value, term.datatype ? oxigraph.namedNode(term.datatype) : undefined);
  }
};

const toN3 = (term: Term) => {
  switch (term.termType) {
    case 'NamedNode':
      return DataFactory.namedNode(term.value);
    case 'BlankNode':
      return DataFactory.blankNode(term.value);
    case 'Literal':
      return DataFactory.literal(
        term.value,
        term.language ?? (term.datatype ? DataFactory.namedNode(term.datatype) : undefined),
      );
  }
};

const subjectTerm = (term: Term): Exclude<Term, { termType: 'Literal' }> => {
  if (term.termType === 'Literal') {
    throw new Error('literal in subject position');
  }
  return term;
};

/** One quad as an n3 quad (`g` absent: default graph). */
export const toN3Quad = (quad: Quad) => {
  const subject = subjectTerm(quad.s);
  return DataFactory.quad(
    subject.termType === 'NamedNode' ? DataFactory.namedNode(subject.value) : DataFactory.blankNode(subject.value),
    DataFactory.namedNode(quad.p.value),
    toN3(quad.o),
    quad.g?.termType === 'NamedNode' ? DataFactory.namedNode(quad.g.value) : DataFactory.defaultGraph(),
  );
};

type RdfjsQuadLike = {
  subject: Parameters<typeof fromRdfjs>[0];
  predicate: Parameters<typeof fromRdfjs>[0];
  object: Parameters<typeof fromRdfjs>[0];
};

const tripleRows = (quads: Iterable<RdfjsQuadLike>): Row[] =>
  [...quads].map((quad) => ({ s: fromRdfjs(quad.subject), p: fromRdfjs(quad.predicate), o: fromRdfjs(quad.object) }));

const oxigraphStores = new WeakMap<readonly Quad[], oxigraph.Store>();
const n3Stores = new WeakMap<readonly Quad[], N3Store>();

/** Each dataset is loaded once per engine; the differential script runs many queries over one. */
const cached = <T extends object>(
  cache: WeakMap<readonly Quad[], T>,
  dataset: readonly Quad[],
  load: (dataset: readonly Quad[]) => T,
) => {
  let store = cache.get(dataset);
  if (!store) {
    store = load(dataset);
    cache.set(dataset, store);
  }
  return store;
};

const describeError = (error: unknown) => (error instanceof Error ? error.message : String(error));

/** Oxigraph (Rust, WASM): in-memory store, named graphs from `g`. */
export const createOxigraphEngine = (): W3cEngine & { load(dataset: readonly Quad[]): oxigraph.Store } => {
  const load = (dataset: readonly Quad[]) => {
    const store = new oxigraph.Store();
    for (const quad of dataset) {
      const graph = quad.g?.termType === 'NamedNode' ? oxigraph.namedNode(quad.g.value) : oxigraph.defaultGraph();
      const subject = subjectTerm(quad.s);
      store.add(
        oxigraph.quad(
          subject.termType === 'NamedNode' ? oxigraph.namedNode(subject.value) : oxigraph.blankNode(subject.value),
          oxigraph.namedNode(quad.p.value),
          toOxigraph(quad.o),
          graph,
        ),
      );
    }
    return store;
  };
  const run = (store: oxigraph.Store, query: string): ResultSet => {
    const result = store.query(query);
    if (typeof result === 'boolean') {
      return { kind: 'boolean', value: result };
    }
    if (typeof result === 'string') {
      throw new Error('unexpected serialized result');
    }
    if (result.length > 0 && 'subject' in result[0]) {
      return { kind: 'graph', triples: tripleRows(result.filter((item) => 'subject' in item)) };
    }
    const rows: Row[] = [];
    for (const solution of result) {
      if (solution instanceof Map) {
        const row: Row = {};
        for (const [name, term] of solution) {
          row[name] = fromRdfjs(term);
        }
        rows.push(row);
      }
    }
    return { kind: 'bindings', vars: [], rows };
  };
  return {
    name: 'oxigraph',
    load,
    evaluate: async (query, dataset) => {
      const store = cached(oxigraphStores, dataset, load);
      const result = run(store, query);
      // An empty answer is ambiguous between SELECT and CONSTRUCT; the query form decides.
      if (
        result.kind === 'bindings' &&
        result.rows.length === 0 &&
        /\b(CONSTRUCT|DESCRIBE)\b/i.test(stripComments(query))
      ) {
        return { kind: 'graph', triples: [] };
      }
      return result;
    },
    checkSyntax: async (query) => {
      new oxigraph.Store().query(query);
    },
    isUnsupported: (error) => /not (yet )?supported|unsupported/i.test(describeError(error)),
  };
};

const stripComments = (query: string) => query.replace(/#[^\n]*/g, '');

/** Comunica (TypeScript) over an N3 store; the store's named graphs are visible to GRAPH. */
export const createComunicaEngine = (): W3cEngine => {
  const engine = new QueryEngine();
  const load = (dataset: readonly Quad[]) => new N3Store(dataset.map(toN3Quad));
  return {
    name: 'comunica',
    evaluate: async (query, dataset) => {
      const store = cached(n3Stores, dataset, load);
      const result = await engine.query(query, { sources: [store] });
      switch (result.resultType) {
        case 'boolean':
          return { kind: 'boolean', value: await result.execute() };
        case 'quads':
          return { kind: 'graph', triples: tripleRows(await (await result.execute()).toArray()) };
        case 'bindings': {
          const bindings = await (await result.execute()).toArray();
          const rows = bindings.map((binding) => {
            const row: Row = {};
            for (const [variable, term] of binding) {
              row[variable.value] = fromRdfjs(term);
            }
            return row;
          });
          return { kind: 'bindings', vars: [], rows };
        }
        default:
          throw new Error('unexpected result type');
      }
    },
    checkSyntax: async (query) => {
      await engine.query(query, { sources: [new N3Store()] });
    },
    isUnsupported: (error) => /not (yet )?supported|unsupported|No actors are able/i.test(describeError(error)),
  };
};
