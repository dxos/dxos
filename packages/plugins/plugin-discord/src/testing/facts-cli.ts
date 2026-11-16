//
// Copyright 2026 DXOS.org
//

// Query a crawl's databases headlessly, printing a table (or JSON lines with --json).
//
//   moon run plugin-discord:facts -- sparql 'SELECT ?p (COUNT(*) AS ?n) WHERE { GRAPH ?g { ?s ?p ?o } } GROUP BY ?p'
//   moon run plugin-discord:facts -- sql 'SELECT author_label, COUNT(*) n FROM message GROUP BY 1 ORDER BY 2 DESC'
//   moon run plugin-discord:facts -- sparql @query.rq --facts <facts.db> --json
//
// `sparql` runs against the fact store (DISCORD_FACTS_DB or --facts); `sql` against the crawl's message store
// (DISCORD_CRAWL_DB or --crawl), run as given, so keep to SELECT. A query starting with `@` is read from that file. IRIs print with the
// prefixes below so tables stay narrow.

import * as Effect from 'effect/Effect';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { parseArgs } from 'node:util';

import * as EffectEx from '@dxos/effect/EffectEx';
import { FactStore, FactStoreLive, type SparqlRow } from '@dxos/pipeline-rdf';

const DEFAULT_DIR = join(homedir(), '.local/share/dxos/discord-pipeline/cloudflare');

const PREFIXES: ReadonlyArray<readonly [string, string]> = [
  ['https://dxos.org/semantic/brain/local/', 'local:'],
  ['https://dxos.org/semantic#', 'sem:'],
  ['https://dxos.org/ontology/', 'dx:'],
  ['https://schema.org/', 'schema:'],
  ['http://xmlns.com/foaf/0.1/', 'foaf:'],
  ['http://rdfs.org/sioc/ns#', 'sioc:'],
  ['http://purl.org/dc/terms/', 'dcterms:'],
  ['http://www.w3.org/1999/02/22-rdf-syntax-ns#', 'rdf:'],
  ['http://www.w3.org/2000/01/rdf-schema#', 'rdfs:'],
  ['http://www.w3.org/2004/02/skos/core#', 'skos:'],
  ['http://www.w3.org/ns/prov#', 'prov:'],
];

/** The SPARQL prologue the prefixes above stand for, prepended to every query so it can use them. */
const PROLOGUE = PREFIXES.map(([iri, prefix]) => `PREFIX ${prefix} <${iri}>`).join('\n');

/** An entity minted inside one fact's graph (`…/semantic/graph/<hash>#python-workers`) reads best as its local name. */
const GRAPH_LOCAL = /^https:\/\/dxos\.org\/semantic\/graph\/[^#]+#(.+)$/;

const shorten = (value: string): string => {
  const local = GRAPH_LOCAL.exec(value);
  if (local) {
    return `#${local[1]}`;
  }
  for (const [iri, prefix] of PREFIXES) {
    if (value.startsWith(iri)) {
      return `${prefix}${value.slice(iri.length)}`;
    }
  }
  return value;
};

const cellOf = (row: SparqlRow, name: string): string => {
  const term = row[name];
  return term === undefined ? '' : term.termType === 'NamedNode' ? shorten(term.value) : term.value;
};

const MAX_CELL = 80;

const BAR_WIDTH = 40;

/** The rows with a bar for their last column, scaled to the largest value, when every value in it is a number. */
const withBars = (
  columns: readonly string[],
  rows: ReadonlyArray<readonly string[]>,
): [readonly string[], ReadonlyArray<readonly string[]>] => {
  const values = rows.map((row) => Number(row[row.length - 1]));
  if (rows.length === 0 || values.some((value) => Number.isNaN(value))) {
    return [columns, rows];
  }
  const max = Math.max(...values.map(Math.abs), 1e-9);
  return [
    [...columns, ''],
    rows.map((row, index) => [...row, '█'.repeat(Math.round((Math.abs(values[index]) / max) * BAR_WIDTH))]),
  ];
};

const printTable = (header: readonly string[], body: ReadonlyArray<readonly string[]>): void => {
  const [columns, rows] = flags.bars ? withBars(header, body) : [header, body];
  const clip = (value: string) => {
    const flat = value.replace(/\s+/g, ' ');
    return flat.length > MAX_CELL ? `${flat.slice(0, MAX_CELL - 1)}…` : flat;
  };
  const clipped = rows.map((row) => row.map(clip));
  const widths = columns.map((column, index) => Math.max(column.length, ...clipped.map((row) => row[index].length)));
  const line = (cells: readonly string[]) => cells.map((cell, index) => cell.padEnd(widths[index])).join('  ');
  console.log(line(columns));
  console.log(line(widths.map((width) => '-'.repeat(width))));
  for (const row of clipped) {
    console.log(line(row));
  }
  console.log(`(${rows.length} rows)`);
};

const { values: flags, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    facts: { type: 'string' },
    crawl: { type: 'string' },
    json: { type: 'boolean', default: false },
    bars: { type: 'boolean', default: false },
  },
});

const [mode, rawQuery] = positionals;
if ((mode !== 'sparql' && mode !== 'sql') || !rawQuery) {
  console.error('Usage: facts-cli (sparql|sql) <query | @file> [--facts <db>] [--crawl <db>] [--json]');
  process.exit(1);
}
const query = rawQuery.startsWith('@') ? readFileSync(rawQuery.slice(1), 'utf8') : rawQuery;

const isRow = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const runSql = (path: string) => {
  const db = new DatabaseSync(path);
  try {
    const rows = db.prepare(query).all().filter(isRow);
    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
    if (flags.json) {
      rows.forEach((row) => console.log(JSON.stringify(row)));
    } else {
      printTable(
        columns,
        rows.map((row) => columns.map((column) => String(row[column] ?? ''))),
      );
    }
  } finally {
    db.close();
  }
};

const runSparql = (path: string) =>
  Effect.gen(function* () {
    const store = yield* FactStore;
    const rows = yield* store.rows(`${PROLOGUE}\n${query}`);
    const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
    if (flags.json) {
      rows.forEach((row) =>
        console.log(JSON.stringify(Object.fromEntries(columns.map((name) => [name, cellOf(row, name)])))),
      );
    } else {
      printTable(
        columns,
        rows.map((row) => columns.map((name) => cellOf(row, name))),
      );
    }
  }).pipe(Effect.provide(FactStoreLive.layerFile(path)));

if (mode === 'sql') {
  const path = flags.crawl ?? process.env.DISCORD_CRAWL_DB ?? join(DEFAULT_DIR, 'crawl.db');
  if (!existsSync(path)) {
    console.error(`No crawl database at ${path}`);
    process.exit(1);
  }
  runSql(path);
} else {
  const path = flags.facts ?? process.env.DISCORD_FACTS_DB ?? join(DEFAULT_DIR, 'facts.db');
  if (!existsSync(path)) {
    console.error(`No fact store at ${path}`);
    process.exit(1);
  }
  void EffectEx.runPromise(runSparql(path)).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
