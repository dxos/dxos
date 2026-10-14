//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { readFileSync } from 'node:fs';
import { Parser, type SparqlQuery } from 'sparqljs';

import * as SqlStorage from '@dxos/sql-sqlite/SqlStorage';

import { SqlSparqlEngine } from '../../engine.ts';
import { UnsupportedSparqlError } from '../../errors.ts';
import { type Quad, type Row } from '../../terms.ts';
import { type CompareOptions, compareResults } from './compare.ts';
import { type W3cTest, localPath } from './manifest.ts';
import { parseRdfFile } from './rdf.ts';
import { type ResultSet, readExpected } from './results.ts';

/** One engine under test. */
export interface W3cEngine {
  readonly name: string;
  /** Evaluates `query` over `dataset` (quads without `g` are the default graph). */
  evaluate(query: string, dataset: readonly Quad[]): Promise<ResultSet>;
  /** Resolves when the engine accepts the query text, rejects when it reports an error. */
  checkSyntax(query: string): Promise<void>;
  /** True when an error means "feature not implemented" rather than a crash. */
  isUnsupported(error: unknown): boolean;
}

export type W3cStatus = 'pass' | 'fail' | 'unsupported' | 'error' | 'skip';

export type W3cOutcome = { status: W3cStatus; message?: string };

/** Query text with the test's base IRI made explicit, so engines need no base option. */
export const queryText = (test: W3cTest): string =>
  `BASE <${test.query.iri}>\n${readFileSync(test.query.path, 'utf8')}`;

/** The test's dataset: `qt:data` as the default graph, `qt:graphData` and the query's FROM documents as named graphs. */
export const loadDataset = (test: W3cTest, parsed?: SparqlQuery): Quad[] => {
  const quads = test.data.flatMap((file) => parseRdfFile(file.path, file.iri));
  const named = new Map(test.graphData.map((file) => [file.name, file.path]));
  if (parsed?.type === 'query' && parsed.from) {
    // FROM / FROM NAMED name documents; an engine that honours them selects these graphs by IRI.
    for (const graph of [...parsed.from.default, ...parsed.from.named]) {
      const path = vendoredPath(graph.value);
      if (!named.has(graph.value) && path) {
        named.set(graph.value, path);
      }
    }
  }
  for (const [name, path] of named) {
    quads.push(...parseRdfFile(path, name, { termType: 'NamedNode', value: name }));
  }
  return quads;
};

/** FROM may name a document (loaded as a graph) or just a graph already in the dataset. */
const vendoredPath = (iri: string): string | undefined => {
  try {
    return localPath(iri);
  } catch {
    return undefined;
  }
};

const parseQuery = (text: string): SparqlQuery | undefined => {
  try {
    return new Parser({ skipUngroupedVariableCheck: true }).parse(text);
  } catch {
    return undefined;
  }
};

/** ORDER BY keys that can be checked on the output: the leading plain variables that are projected. */
const orderOf = (parsed: SparqlQuery | undefined): CompareOptions['orderBy'] => {
  if (parsed?.type !== 'query' || parsed.queryType !== 'SELECT' || !parsed.order) {
    return undefined;
  }
  const projected = new Set(
    parsed.variables.flatMap((item) =>
      'termType' in item ? (item.termType === 'Variable' ? [item.value] : []) : [item.variable.value],
    ),
  );
  const wildcard = parsed.variables.some((item) => 'termType' in item && item.termType === 'Wildcard');
  const vars: string[] = [];
  for (const { expression } of parsed.order) {
    if (!('termType' in expression) || expression.termType !== 'Variable') {
      break;
    }
    if (!wildcard && !projected.has(expression.value)) {
      break;
    }
    vars.push(expression.value);
  }
  return vars.length > 0 ? { vars } : undefined;
};

/** How answers to `parsed` compare: ordered under ORDER BY, distinct-only under REDUCED. */
export const compareOptions = (parsed: SparqlQuery | string | undefined): CompareOptions => {
  const query = typeof parsed === 'string' ? parseQuery(parsed) : parsed;
  return {
    orderBy: orderOf(query),
    reduced: query?.type === 'query' && query.queryType === 'SELECT' && !!query.reduced,
  };
};

const describeError = (error: unknown) => (error instanceof Error ? error.message : String(error)).split('\n')[0];

/** Runs one W3C test against one engine. */
export const runW3cTest = async (engine: W3cEngine, test: W3cTest): Promise<W3cOutcome> => {
  if (test.skip) {
    return { status: 'skip', message: test.skip };
  }
  const query = queryText(test);
  if (test.type !== 'eval') {
    let accepted = true;
    let message: string | undefined;
    try {
      await engine.checkSyntax(query);
    } catch (error) {
      accepted = false;
      message = describeError(error);
    }
    const pass = accepted === (test.type === 'positiveSyntax');
    return pass ? { status: 'pass' } : { status: 'fail', message: message ?? 'accepted an invalid query' };
  }
  const parsed = parseQuery(query);
  if (!test.result) {
    return { status: 'skip', message: 'no expected result' };
  }
  const graphResult = parsed?.type === 'query' && (parsed.queryType === 'CONSTRUCT' || parsed.queryType === 'DESCRIBE');
  const expected = readExpected(test.result.path, test.result.iri, graphResult);
  let actual: ResultSet;
  try {
    actual = await engine.evaluate(query, loadDataset(test, parsed));
  } catch (error) {
    return { status: engine.isUnsupported(error) ? 'unsupported' : 'error', message: describeError(error) };
  }
  const diff = compareResults(expected, actual, compareOptions(parsed));
  return diff === undefined ? { status: 'pass' } : { status: 'fail', message: diff };
};

/** Engines already loaded with a dataset, so a differential run over one dataset ingests it once. */
const loaded = new WeakMap<readonly Quad[], SqlSparqlEngine>();

/** This package's engine, on a fresh in-memory `node:sqlite` database per dataset. */
export const sqlEngine: W3cEngine = {
  name: 'sparql-sqlite',
  evaluate: async (query, dataset) => {
    let engine = loaded.get(dataset);
    if (!engine) {
      engine = new SqlSparqlEngine(Effect.runSync(SqlStorage.makeMemory()));
      engine.init();
      engine.insert(dataset);
      loaded.set(dataset, engine);
    }
    const parsed = new Parser({ skipUngroupedVariableCheck: true }).parse(query);
    const rows = engine.query(query);
    if (parsed.type !== 'query') {
      throw new UnsupportedSparqlError('update in a query test');
    }
    switch (parsed.queryType) {
      case 'ASK':
        return { kind: 'boolean', value: rows.length > 0 };
      case 'CONSTRUCT':
        return { kind: 'graph', triples: rows };
      case 'SELECT':
        return { kind: 'bindings', vars: projectedVars(parsed.variables, rows), rows };
      default:
        throw new UnsupportedSparqlError(`query type ${parsed.queryType}`);
    }
  },
  checkSyntax: async (query) => {
    const engine = new SqlSparqlEngine(Effect.runSync(SqlStorage.makeMemory()));
    engine.init();
    try {
      engine.query(query);
    } catch (error) {
      // The parser accepted the text; a feature the compiler lacks is not a syntax verdict.
      if (!(error instanceof UnsupportedSparqlError)) {
        throw error;
      }
    }
  },
  isUnsupported: (error) => error instanceof UnsupportedSparqlError,
};

const projectedVars = (
  variables: { termType?: string; value?: string; variable?: { value: string } }[],
  rows: Row[],
) =>
  variables.some((item) => item.termType === 'Wildcard')
    ? [...new Set(rows.flatMap(Object.keys))]
    : variables.flatMap((item) => (item.variable ? [item.variable.value] : item.value ? [item.value] : []));
