//
// Copyright 2026 DXOS.org
//

// Reference answers from in-memory Oxigraph: rows + checksum per query and scale.
// oxigraph is not a dependency of this package, so it is loaded from a directory given on the command line.
// Usage: node --experimental-strip-types bench/oracle.ts <dir containing node_modules/oxigraph> > oracle.json

import { createRequire } from 'node:module';
import { resolve } from 'node:path';

import { type Quad, type Row, type Term, iri, lit } from '../src/terms.ts';
import { checksumRows } from '../src/testing/checksum.ts';
import { generateCode, generateFacts } from '../src/testing/gen.ts';
import { PROBES } from '../src/testing/probes.ts';
import { QUERIES, queryById } from '../src/testing/queries.ts';

type OxigraphTerm = { termType: string; value: string; language?: string; datatype?: { value: string } };
type OxigraphStore = {
  load(data: string, options: { format: string }): void;
  query(sparql: string): Iterable<Map<string, OxigraphTerm>>;
};

const oxigraphDir = process.argv[2];
if (!oxigraphDir) {
  throw new Error('usage: oracle.ts <dir containing node_modules/oxigraph>');
}
const { Store }: { Store: new () => OxigraphStore } = createRequire(resolve(oxigraphDir, 'index.js'))('oxigraph');

const toNt = (term: Term): string => {
  switch (term.termType) {
    case 'NamedNode':
      return `<${term.value}>`;
    case 'BlankNode':
      return `_:${term.value}`;
    case 'Literal': {
      const escaped = term.value
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r');
      if (term.language) {
        return `"${escaped}"@${term.language}`;
      }
      return term.datatype ? `"${escaped}"^^<${term.datatype}>` : `"${escaped}"`;
    }
  }
};

const toNQuads = (quads: readonly Quad[]): string =>
  quads
    .map((quad) => `${toNt(quad.s)} ${toNt(quad.p)} ${toNt(quad.o)}${quad.g ? ` ${toNt(quad.g)}` : ''} .\n`)
    .join('');

const fromOxigraph = (term: OxigraphTerm): Term =>
  term.termType === 'Literal'
    ? lit(term.value, term.datatype?.value, term.language || undefined)
    : term.termType === 'BlankNode'
      ? { termType: 'BlankNode', value: term.value }
      : iri(term.value);

const run = (store: OxigraphStore, sparql: string) => {
  const rows: Row[] = [];
  for (const binding of store.query(sparql)) {
    const row: Row = {};
    for (const [name, term] of binding) {
      row[name] = fromOxigraph(term);
    }
    rows.push(row);
  }
  return { rows: rows.length, checksum: checksumRows(rows) };
};

const expected: Record<string, Record<string, { rows: number; checksum: string }>> = {};
const store = new Store();
let loaded = 0;
for (const scale of [1000, 10_000, 100_000]) {
  while (loaded < scale) {
    const count = Math.min(5000, scale - loaded);
    store.load(toNQuads(generateFacts(loaded, count)), { format: 'application/n-quads' });
    loaded += count;
  }
  expected[`facts:${scale}`] = Object.fromEntries(
    QUERIES.filter((query) => query.id !== 'Q7_path').map((query) => [query.id, run(store, query.sparql)]),
  );
  if (scale === 1000) {
    expected.probes = Object.fromEntries(PROBES.map((probe) => [probe.id, run(store, probe.sparql)]));
  }
}
const code = new Store();
code.load(toNQuads(generateCode(0, 10_000)), { format: 'application/n-quads' });
expected['code:10000'] = { Q7_path: run(code, queryById('Q7_path').sparql) };
console.log(JSON.stringify(expected, null, 2));
