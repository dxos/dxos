//
// Copyright 2026 DXOS.org
//
// LOCAL fallback/oracle run: loads an N-Triples file into in-memory Oxigraph (wasm, in node on the sandbox, NOT
// on Cloudflare) and runs a query set, recording rows, checksum and median ms. Used as the correctness oracle for
// the deployed runs and as the fallback-engine measurement for queries the compiler rejects or runs badly.
// oxigraph is not a dependency of this package, so it is loaded from a directory given on the command line.
//
// Usage: node --experimental-strip-types bench/oxigraph-local.ts <oxigraph dir> <data.nt> <queries.json> <out.json>

import { createReadStream, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { createInterface } from 'node:readline';

import { type Row, type Term, iri, lit } from '../src/terms.ts';
import { checksumRows } from '../src/testing/checksum.ts';

type OxigraphTerm = { termType: string; value: string; language?: string; datatype?: { value: string } };
type OxigraphQuad = { subject: OxigraphTerm; predicate: OxigraphTerm; object: OxigraphTerm };
type OxigraphStore = {
  load(data: string, options: { format: string }): void;
  query(sparql: string): Iterable<Map<string, OxigraphTerm> | OxigraphQuad> | boolean | string;
  size: number;
};

const [oxigraphDir, dataFile, queriesFile, outFile] = process.argv.slice(2);
const { Store }: { Store: new () => OxigraphStore } = createRequire(resolve(oxigraphDir, 'index.js'))('oxigraph');

const fromOxigraph = (term: OxigraphTerm): Term =>
  term.termType === 'Literal'
    ? lit(term.value, term.language ? undefined : term.datatype?.value, term.language || undefined)
    : term.termType === 'BlankNode'
      ? { termType: 'BlankNode', value: term.value }
      : iri(term.value);

const run = (store: OxigraphStore, sparql: string): Row[] => {
  const result = store.query(sparql);
  if (typeof result === 'boolean') {
    return result ? [{}] : [];
  }
  if (typeof result === 'string') {
    throw new Error('unexpected serialized result');
  }
  const rows: Row[] = [];
  for (const item of result) {
    const row: Row = {};
    if (item instanceof Map) {
      for (const [name, term] of item) {
        row[name] = fromOxigraph(term);
      }
    } else {
      row.s = fromOxigraph(item.subject);
      row.p = fromOxigraph(item.predicate);
      row.o = fromOxigraph(item.object);
    }
    rows.push(row);
  }
  return rows;
};

const store = new Store();
const loadStarted = performance.now();
let chunk: string[] = [];
for await (const line of createInterface({ input: createReadStream(dataFile), crlfDelay: Infinity })) {
  chunk.push(line);
  if (chunk.length >= 200_000) {
    store.load(chunk.join('\n'), { format: 'application/n-triples' });
    chunk = [];
  }
}
store.load(chunk.join('\n'), { format: 'application/n-triples' });
const loadMs = performance.now() - loadStarted;
console.error(`loaded ${store.size} triples in ${(loadMs / 1000).toFixed(1)} s`);

const queries: { id: string; sparql: string }[] = JSON.parse(readFileSync(queriesFile, 'utf8'));
const results = [];
for (const query of queries) {
  try {
    const started = performance.now();
    const rows = run(store, query.sparql);
    const firstMs = performance.now() - started;
    const times = [firstMs];
    for (let index = 0; index < (firstMs > 5_000 ? 0 : 3); index++) {
      const again = performance.now();
      run(store, query.sparql);
      times.push(performance.now() - again);
    }
    times.sort((left, right) => left - right);
    const ms = times[Math.floor(times.length / 2)];
    results.push({ id: query.id, rows: rows.length, checksum: checksumRows(rows), ms });
    console.error(query.id.padEnd(16), String(rows.length).padStart(7), 'rows', ms.toFixed(1), 'ms');
  } catch (err) {
    results.push({ id: query.id, error: String(err).slice(0, 300) });
    console.error(query.id, 'ERROR', String(err).slice(0, 200));
  }
}
writeFileSync(
  outFile,
  JSON.stringify({ engine: 'oxigraph-js (LOCAL, in-memory)', triples: store.size, loadMs, results }, null, 1),
);
