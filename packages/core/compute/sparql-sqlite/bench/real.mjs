#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

// Real-dataset runner for the deployed bench worker (see docs/PERF.md). All timing is client-side, because
// `Date.now()` does not advance inside a DO during synchronous SQLite work.
//
//   node --experimental-strip-types bench/real.mjs load --url U --db D --file data.nt [--batch 20000] [--concurrency 2]
//   node --experimental-strip-types bench/real.mjs calibrate --url U --db D --file data.nt [--batches 5]
//   node --experimental-strip-types bench/real.mjs query --url U --db D --queries q.json --out r.json
//        [--only id,id] [--prefix] [--reps 5]
//
// `query` times every query (median wall of single runs; server ms = slope between 1 and 5 in-DO runs),
// captures the compiled SQL, EXPLAIN QUERY PLAN and sqlite_stat1 from the DO, and with `--prefix` counts
// the actual rows of each join prefix in plan order (an approximation of EXPLAIN ANALYZE).

import { createReadStream, readFileSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { parseArgs } from 'node:util';
import { gzipSync } from 'node:zlib';
import sparqljs from 'sparqljs';

import { parseNTriples } from './ntriples.ts';

const { positionals, values: args } = parseArgs({
  allowPositionals: true,
  options: {
    'url': { type: 'string', default: 'https://rdf-bench-sql-compiler.dxos.workers.dev' },
    'db': { type: 'string' },
    'file': { type: 'string' },
    'batch': { type: 'string', default: '20000' },
    'batches': { type: 'string', default: '5' },
    'concurrency': { type: 'string', default: '2' },
    'queries': { type: 'string' },
    'only': { type: 'string' },
    'out': { type: 'string' },
    'reps': { type: 'string', default: '5' },
    'prefix': { type: 'boolean', default: false },
    // Engine selectivity hints for `query` runs: 1 (default engine behaviour) or 0 (SQLite stats only).
    'hints': { type: 'string' },
    // Waits until /ping reports this BUILD stamp: right after a deploy, existing DOs can still run old code.
    'expect-build': { type: 'string' },
  },
});

const base = args.url.replace(/\/$/, '');
const median = (values) => {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted.length ? sorted[Math.floor(sorted.length / 2)] : undefined;
};
const log = (...parts) => console.error(`[${args.db}]`, ...parts);

const call = async (method, path, { db = args.db, params = {}, body, headers, timeout = 900_000 } = {}) => {
  const url = new URL(base + path);
  url.searchParams.set('db', db);
  if (args.hints !== undefined) {
    url.searchParams.set('hints', args.hints);
  }
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }
  const started = performance.now();
  let text;
  let status = 0;
  try {
    const response = await fetch(url, {
      method,
      ...(body === undefined ? {} : { body }),
      headers,
      signal: AbortSignal.timeout(timeout),
    });
    status = response.status;
    text = await response.text();
  } catch (err) {
    return { ms: performance.now() - started, data: { error: `fetch: ${err.message}` } };
  }
  const ms = performance.now() - started;
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { error: `non-json ${status}: ${text.slice(0, 300)}` };
  }
  if (status >= 400 && !data.error) {
    data.error = `HTTP ${status}`;
  }
  return { ms, data };
};

const pingMs = async (db = args.db) => {
  const pings = [];
  let build;
  for (let index = 0; index < 7; index++) {
    const { ms, data } = await call('GET', '/ping', { db });
    pings.push(ms);
    build = data.build;
  }
  return { pingMs: median(pings), build };
};

/** Yields batches of `size` N-Triples lines from a file. */
async function* batches(file, size) {
  let lines = [];
  for await (const line of createInterface({ input: createReadStream(file), crlfDelay: Infinity })) {
    if (line.length === 0) {
      continue;
    }
    lines.push(line);
    if (lines.length >= size) {
      yield lines.join('\n');
      lines = [];
    }
  }
  if (lines.length > 0) {
    yield lines.join('\n');
  }
}

const postBatch = (db, text, format, dry) => {
  const body = gzipSync(Buffer.from(text));
  return call('POST', '/load', {
    db,
    params: { format, gzip: 1, ...(dry ? { dry: 1 } : {}) },
    body,
  }).then((result) => ({ ...result, gzBytes: body.length }));
};

const load = async () => {
  await call('POST', '/reset');
  const { pingMs: ping, build } = await pingMs();
  log('ping', ping.toFixed(1), 'build', build);
  const started = performance.now();
  const inflight = new Set();
  const perBatch = [];
  let quads = 0;
  let rawBytes = 0;
  let gzBytes = 0;
  let failed;
  for await (const text of batches(args.file, Number(args.batch))) {
    if (failed) {
      break;
    }
    rawBytes += Buffer.byteLength(text);
    const task = postBatch(args.db, text, 'nt', false).then(({ ms, data, gzBytes: size }) => {
      gzBytes += size;
      if (data.error) {
        failed = data.error;
        return;
      }
      quads += data.quads;
      perBatch.push(ms);
      if (perBatch.length % 25 === 0) {
        const elapsed = (performance.now() - started) / 1000;
        log(`${quads} quads, ${(quads / elapsed).toFixed(0)}/s, last batch ${ms.toFixed(0)} ms`);
      }
    });
    inflight.add(task);
    void task.finally(() => inflight.delete(task));
    if (inflight.size >= Number(args.concurrency)) {
      await Promise.race(inflight);
    }
  }
  await Promise.all(inflight);
  const elapsedMs = performance.now() - started;
  const stats = (await call('GET', '/stats')).data;
  const result = {
    db: args.db,
    file: args.file.split('/').pop(),
    url: base,
    build,
    at: new Date().toISOString(),
    error: failed?.slice(0, 500),
    pingMs: ping,
    batchLines: Number(args.batch),
    concurrency: Number(args.concurrency),
    quadsSent: quads,
    rawBytes,
    gzBytes,
    elapsedMs,
    quadsPerSec: quads / (elapsedMs / 1000),
    medianBatchMs: median(perBatch),
    p90BatchMs: [...perBatch].sort((left, right) => left - right)[Math.floor(perBatch.length * 0.9)],
    maxBatchMs: Math.max(...perBatch),
    stats,
    bytesPerTriple: stats.dbBytes / stats.triples,
  };
  log(JSON.stringify(result));
  if (args.out) {
    writeFileSync(args.out, JSON.stringify(result, null, 2));
  }
};

/** Splits ingest cost: upload + parse in the DO (dry) vs insert, for N-Triples parsed in the DO vs JSON parsed client-side. */
const calibrate = async () => {
  const dbNt = `${args.db}-cal-nt`;
  const dbJson = `${args.db}-cal-json`;
  await call('POST', '/reset', { db: dbNt });
  await call('POST', '/reset', { db: dbJson });
  const { pingMs: ping, build } = await pingMs(dbNt);
  const rows = [];
  let count = 0;
  for await (const text of batches(args.file, Number(args.batch))) {
    if (count++ >= Number(args.batches)) {
      break;
    }
    const parseStarted = performance.now();
    const json = JSON.stringify(parseNTriples(text));
    const clientParseMs = performance.now() - parseStarted;
    const ntDry = await postBatch(dbNt, text, 'nt', true);
    const jsonDry = await postBatch(dbJson, json, 'json', true);
    const ntLoad = await postBatch(dbNt, text, 'nt', false);
    const jsonLoad = await postBatch(dbJson, json, 'json', false);
    rows.push({
      quads: ntLoad.data.quads,
      ntBytes: Buffer.byteLength(text),
      jsonBytes: Buffer.byteLength(json),
      ntGz: ntDry.gzBytes,
      jsonGz: jsonDry.gzBytes,
      clientParseMs,
      ntDryMs: ntDry.ms,
      jsonDryMs: jsonDry.ms,
      ntLoadMs: ntLoad.ms,
      jsonLoadMs: jsonLoad.ms,
      error: ntLoad.data.error ?? jsonLoad.data.error,
    });
    log(JSON.stringify(rows.at(-1)));
  }
  const summary = { db: args.db, file: args.file.split('/').pop(), url: base, build, pingMs: ping, rows };
  for (const key of ['clientParseMs', 'ntDryMs', 'jsonDryMs', 'ntLoadMs', 'jsonLoadMs', 'ntGz', 'jsonGz']) {
    summary[`median_${key}`] = median(rows.map((row) => row[key]));
  }
  log(JSON.stringify(summary));
  if (args.out) {
    writeFileSync(args.out, JSON.stringify(summary, null, 2));
  }
};

//
// Query timing, plans and join-prefix cardinalities.
//

const runSparql = (sparql, iters, timeout) => call('POST', '/sparql', { params: { iters }, body: sparql, timeout });

const timeQuery = async (query, ping) => {
  const first = await runSparql(query.sparql, 1, 600_000);
  if (first.data.error) {
    return { error: first.data.error.slice(0, 400), firstMs: first.ms };
  }
  const slow = first.ms > 3_000;
  if (first.ms > 30_000) {
    return {
      rows: first.data.rows,
      checksum: first.data.checksum,
      firstMs: first.ms,
      wallMs: first.ms,
      serverMs: first.ms - ping,
      single: true,
    };
  }
  const singles = [];
  for (let index = 0; index < (slow ? 2 : Number(args.reps)); index++) {
    singles.push((await runSparql(query.sparql, 1)).ms);
  }
  const fives = [];
  for (let index = 0; index < (slow ? 1 : 3); index++) {
    fives.push((await runSparql(query.sparql, 5)).ms);
  }
  const wallMs = median(singles);
  return {
    rows: first.data.rows,
    checksum: first.data.checksum,
    firstMs: first.ms,
    wallMs,
    serverMs: Math.max(0, (median(fives) - wallMs) / 4),
  };
};

const STEP = /^(SCAN|SEARCH) (\w+)(?: USING (?:COVERING )?(?:INDEX (\w+)|(PRIMARY KEY))(?: \((.*)\))?)?/;

/** Parses EQP rows into loop steps: alias, index and the number of leading equality columns. */
const planSteps = (plan) =>
  plan.flatMap((row) => {
    const detail = row.replace(/^\d+\/\d+ /, '');
    const match = STEP.exec(detail);
    if (!match) {
      return [];
    }
    const [, op, alias, index, pk, cons] = match;
    const eq = cons ? cons.split(' AND ').filter((part) => /=\?$/.test(part)).length : 0;
    return [{ op, alias, index: pk ? 'quads' : index, eq, range: !!cons && /[<>]/.test(cons), detail }];
  });

/** Average rows per equality prefix from sqlite_stat1 (`stat` = "N a b c d"). */
const statFanout = (stat1, step) => {
  const idx =
    step.index === 'quads'
      ? stat1.find((row) => /autoindex|^quads$/.test(row.idx))?.stat
      : stat1.find((row) => row.idx === step.index)?.stat;
  const fallback = stat1.find((row) => /autoindex|^quads$/.test(row.idx))?.stat ?? stat1[0]?.stat;
  const numbers = (idx ?? fallback ?? '').split(' ').map(Number);
  if (!step.index || step.eq === 0) {
    return numbers[0];
  }
  return numbers[Math.min(step.eq, numbers.length - 1)];
};

const Parser = new sparqljs.Parser();
const Generator = new sparqljs.Generator();

const termVars = (term) => (term.termType === 'Variable' ? [term.value] : []);
const exprVars = (expr) => {
  if (!expr || typeof expr !== 'object') {
    return [];
  }
  if (expr.termType === 'Variable') {
    return [expr.value];
  }
  if (Array.isArray(expr)) {
    return expr.flatMap(exprVars);
  }
  return (expr.args ?? []).flatMap(exprVars);
};

/**
 * Counts the rows after each join step in plan order, for queries whose WHERE is one BGP plus FILTERs
 * (pattern i is compiled to alias q<i>). Returns undefined for other shapes.
 */
const prefixCounts = async (query, steps, stat1) => {
  const parsed = Parser.parse(query.sparql);
  const where = parsed.where ?? [];
  if (!where.every((pattern) => pattern.type === 'bgp' || pattern.type === 'filter')) {
    return undefined;
  }
  const triples = where.filter((pattern) => pattern.type === 'bgp').flatMap((pattern) => pattern.triples);
  if (triples.some((triple) => triple.predicate.type === 'path')) {
    return undefined;
  }
  const filters = where.filter((pattern) => pattern.type === 'filter');
  const order = steps.filter((step) => /^q\d+$/.test(step.alias)).map((step) => Number(step.alias.slice(1)));
  if (order.length !== triples.length || new Set(order).size !== triples.length) {
    return undefined;
  }
  const out = [];
  let estimate = 1;
  for (let length = 1; length <= order.length; length++) {
    const chosen = order.slice(0, length).map((index) => triples[index]);
    const bound = new Set(chosen.flatMap((triple) => [...termVars(triple.subject), ...termVars(triple.object)]));
    const usable = filters.filter((filter) => exprVars(filter.expression).every((name) => bound.has(name)));
    const step = steps.find((candidate) => candidate.alias === `q${order[length - 1]}`);
    estimate *= statFanout(stat1, step) ?? 1;
    const countQuery = {
      type: 'query',
      queryType: 'SELECT',
      prefixes: parsed.prefixes,
      variables: [
        {
          expression: {
            type: 'aggregate',
            aggregation: 'count',
            distinct: false,
            expression: { termType: 'Wildcard', value: '*' },
          },
          variable: { termType: 'Variable', value: 'n' },
        },
      ],
      where: [{ type: 'bgp', triples: chosen }, ...usable],
    };
    const started = performance.now();
    const { data } = await runSparql(Generator.stringify(countQuery), 1, 300_000);
    const actual = data.error ? undefined : Number(data.sample?.[0]?.n?.value);
    out.push({
      step: step.detail,
      estimate: Math.round(estimate),
      actual,
      ms: Math.round(performance.now() - started),
      error: data.error?.slice(0, 200),
    });
    if (data.error) {
      break;
    }
  }
  return out;
};

const awaitBuild = async () => {
  for (let attempt = 0; args['expect-build'] && attempt < 60; attempt++) {
    const { data } = await call('GET', '/ping');
    if (String(data.build) === args['expect-build']) {
      return;
    }
    log('waiting for build', args['expect-build'], 'got', data.build);
    // A busy instance keeps its old code; aborting it makes the next request start the new one.
    await call('POST', '/abort');
    await new Promise((resolve) => setTimeout(resolve, 5_000));
  }
  if (args['expect-build']) {
    throw new Error(`DO never reported build ${args['expect-build']}`);
  }
};

const queryAll = async () => {
  await awaitBuild();
  const all = JSON.parse(readFileSync(args.queries, 'utf8'));
  const only = args.only?.split(',');
  const queries = only ? all.filter((query) => only.some((id) => query.id === id || query.template === id)) : all;
  const { pingMs: ping, build } = await pingMs();
  const stats = (await call('GET', '/stats')).data;
  log('ping', ping.toFixed(1), 'build', build, JSON.stringify(stats));
  const results = [];
  for (const query of queries) {
    const timing = await timeQuery(query, ping);
    const explain = (await call('POST', '/explain', { body: query.sparql })).data;
    const entry = { ...query, ...timing };
    if (!explain.error) {
      entry.sql = explain.sql;
      entry.plan = explain.plan;
      if (args.prefix && !timing.error) {
        entry.prefix = await prefixCounts(query, planSteps(explain.plan), explain.stat1 ?? []);
      }
    } else if (!entry.error) {
      entry.explainError = explain.error.slice(0, 300);
    }
    results.push(entry);
    log(
      query.id.padEnd(16),
      timing.error
        ? `ERROR ${timing.error.slice(0, 160)}`
        : `${String(timing.rows).padStart(7)} rows  wall ${timing.wallMs.toFixed(0).padStart(6)}  server ${timing.serverMs.toFixed(1).padStart(8)}`,
    );
  }
  const stat1 = (await call('POST', '/explain', { body: 'SELECT * WHERE { ?s ?p ?o } LIMIT 1' })).data.stat1;
  const out = {
    db: args.db,
    url: base,
    build,
    hints: args.hints,
    at: new Date().toISOString(),
    pingMs: ping,
    stats,
    stat1,
    queries: results,
  };
  writeFileSync(args.out ?? `/tmp/perf-${args.db}.json`, JSON.stringify(out, null, 1));
  log('wrote', args.out);
};

switch (positionals[0]) {
  case 'load':
    await load();
    break;
  case 'calibrate':
    await calibrate();
    break;
  case 'query':
    await queryAll();
    break;
  default:
    console.error('usage: real.mjs load|calibrate|query ...');
    process.exit(1);
}
