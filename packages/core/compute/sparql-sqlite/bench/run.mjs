#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

// Benchmark runner: drives the deployed (or `wrangler dev`) bench worker over HTTP and measures wall time
// from the client. Usage:
//   node bench/run.mjs --url https://rdf-bench-sql-compiler.<sub>.workers.dev [--scales 1000,10000,100000]
//        [--batch 1000] [--code 10000] [--reps 5] [--out results.json] [--queries Q1_lookup,...] [--probes]
//        [--expected oracle.json]

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { parseArgs } from 'node:util';

const { values: args } = parseArgs({
  options: {
    url: { type: 'string' },
    variant: { type: 'string', default: 'sql-compiler' },
    scales: { type: 'string', default: '1000,10000,100000' },
    batch: { type: 'string', default: '1000' },
    code: { type: 'string', default: '10000' },
    reps: { type: 'string', default: '5' },
    out: { type: 'string' },
    queries: { type: 'string' },
    db: { type: 'string' },
    probes: { type: 'boolean', default: false },
    // The checked-in oracle covers 1k/10k facts; run bench/oracle.ts for 100k.
    expected: { type: 'string' },
  },
});

const expected = JSON.parse(
  readFileSync(args.expected ?? new URL('../src/testing/expected.json', import.meta.url), 'utf8'),
);
const base = args.url.replace(/\/$/, '');
const db = args.db ?? `run-${Date.now()}`;
const reps = Number(args.reps);
const batch = Number(args.batch);
const median = (values) => {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor(sorted.length / 2)];
};

const call = async (method, path, params = {}, body) => {
  const url = new URL(base + path);
  url.searchParams.set('db', db);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }
  const started = performance.now();
  const response = await fetch(url, {
    method,
    signal: AbortSignal.timeout(600_000),
    ...(body === undefined ? {} : { body }),
  });
  const text = await response.text();
  const ms = performance.now() - started;
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { error: `non-json ${response.status}: ${text.slice(0, 300)}` };
  }
  if (!response.ok && !data.error) {
    data.error = `HTTP ${response.status}`;
  }
  return { ms, data };
};

const log = (...parts) => console.error(`[${args.variant}]`, ...parts);
const result = { variant: args.variant, url: base, db, startedAt: new Date().toISOString(), scales: [] };

const pings = [];
for (let index = 0; index < 10; index++) {
  pings.push((await call('GET', '/ping')).ms);
}
result.pingMs = median(pings);
log('ping', result.pingMs.toFixed(1));

const gens = [];
for (let index = 0; index < 3; index++) {
  gens.push((await call('POST', '/ingest', { kind: 'facts', start: 0, count: batch, gen: 'only' })).ms);
}
result.genOnlyMsPerBatch = median(gens);

const queryIds = args.queries
  ? args.queries.split(',')
  : (await call('GET', '/queries')).data.map((query) => query.id).filter((id) => id !== 'Q7_path');

const timeQuery = async (id, scale) => {
  const first = await call('GET', '/query', { q: id, iters: 1 });
  if (first.data.error) {
    return { id, error: first.data.error.slice(0, 500) };
  }
  const singles = [];
  for (let index = 0; index < reps; index++) {
    singles.push((await call('GET', '/query', { q: id, iters: 1 })).ms);
  }
  const fives = [];
  for (let index = 0; index < 3; index++) {
    fives.push((await call('GET', '/query', { q: id, iters: 5 })).ms);
  }
  const wallMs = median(singles);
  const want = expected[`facts:${scale}`]?.[id];
  return {
    id,
    correct: want ? want.rows === first.data.rows && want.checksum === first.data.checksum : undefined,
    rows: first.data.rows,
    checksum: first.data.checksum,
    firstMs: first.ms,
    wallMs,
    // Per-execution server time with network removed: slope between 1 and 5 iterations.
    serverMs: Math.max(0, (median(fives) - wallMs) / 4),
  };
};

if (args.probes) {
  // Capability probes on a fresh 1000-fact db; recorded and then the normal run continues.
  const probeDb = `${db}-probes`;
  const probeCall = async (method, path, params, body) => {
    const url = new URL(base + path);
    url.searchParams.set('db', probeDb);
    for (const [key, value] of Object.entries(params ?? {})) {
      url.searchParams.set(key, String(value));
    }
    const response = await fetch(url, {
      method,
      signal: AbortSignal.timeout(600_000),
      ...(body === undefined ? {} : { body }),
    });
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch {
      return { error: `non-json ${response.status}: ${text.slice(0, 300)}` };
    }
  };
  await probeCall('POST', '/ingest', { kind: 'facts', start: 0, count: 1000 });
  const probes = await probeCall('GET', '/probes');
  result.probes = {};
  for (const probe of probes) {
    const data = await probeCall('POST', '/sparql', {}, probe.sparql);
    const want = expected.probes[probe.id];
    result.probes[probe.id] = data.error
      ? { pass: false, error: data.error.slice(0, 300) }
      : { pass: data.rows === want.rows && data.checksum === want.checksum, rows: data.rows, want: want.rows };
  }
  const passed = Object.values(result.probes).filter((probe) => probe.pass).length;
  log(
    `probes ${passed}/${probes.length}`,
    JSON.stringify(Object.fromEntries(Object.entries(result.probes).filter(([, probe]) => !probe.pass))),
  );
}

let loaded = 0;
for (const scale of args.scales.split(',').map(Number)) {
  const ingest = [];
  while (loaded < scale) {
    const count = Math.min(batch, scale - loaded);
    const { ms, data } = await call('POST', '/ingest', { kind: 'facts', start: loaded, count });
    if (data.error) {
      log('ingest failed at', loaded, data.error.slice(0, 300));
      result.scales.push({ facts: loaded, ingestError: data.error.slice(0, 500) });
      break;
    }
    ingest.push({ ms, quads: data.quads });
    loaded += count;
  }
  if (loaded < scale) {
    break;
  }
  const quads = ingest.reduce((sum, entry) => sum + entry.quads, 0);
  const ingestMs = ingest.reduce((sum, entry) => sum + entry.ms, 0);
  const stats = (await call('GET', '/stats')).data;
  log(`scale ${scale}: ingest ${quads} quads in ${ingestMs.toFixed(0)}ms`, JSON.stringify(stats));
  const queries = [];
  for (const id of queryIds) {
    const entry = await timeQuery(id, scale);
    log(
      `  ${id}`,
      entry.error ??
        `${entry.rows} rows ${entry.correct === false ? 'WRONG ' : ''}wall=${entry.wallMs.toFixed(1)} server=${entry.serverMs.toFixed(1)}`,
    );
    queries.push(entry);
  }
  await call('POST', '/abort');
  const cold = await call('GET', '/query', { q: 'Q1_lookup', iters: 1 });
  const coldQ2 = await call('GET', '/query', { q: 'Q2_entity', iters: 1 });
  log(`  cold start Q1 ${cold.ms.toFixed(0)}ms`, cold.data.error ?? '');
  result.scales.push({
    facts: scale,
    batchQuads: quads,
    ingestMs,
    ingestQuadsPerSec: quads / ((ingestMs - ingest.length * result.pingMs) / 1000),
    medianBatchMs: median(ingest.map((entry) => entry.ms)),
    stats,
    queries,
    coldStartMs: cold.ms,
    coldStartError: cold.data.error,
    afterColdQ2Ms: coldQ2.ms,
  });
}

if (Number(args.code) > 0) {
  const codeDb = `${db}-code`;
  const codeCall = (method, path, params) => {
    const url = new URL(base + path);
    url.searchParams.set('db', codeDb);
    for (const [key, value] of Object.entries(params ?? {})) {
      url.searchParams.set(key, String(value));
    }
    const started = performance.now();
    return fetch(url, { method, signal: AbortSignal.timeout(600_000) })
      .then((response) => response.json())
      .then((data) => ({ data, ms: performance.now() - started }));
  };
  let ingestMs = 0;
  let error;
  for (let start = 0; start < Number(args.code); start += 2000) {
    const { ms, data } = await codeCall('POST', '/ingest', { kind: 'code', start, count: 2000 });
    ingestMs += ms;
    if (data.error) {
      error = data.error;
      break;
    }
  }
  const timings = [];
  let first;
  for (let index = 0; index < reps + 1 && !error; index++) {
    const { ms, data } = await codeCall('GET', '/query', { q: 'Q7_path', iters: 1 });
    if (data.error) {
      error = data.error;
      break;
    }
    first ??= data;
    if (index > 0) {
      timings.push(ms);
    }
  }
  result.code = {
    files: Number(args.code),
    ingestMs,
    error: error?.slice(0, 500),
    rows: first?.rows,
    correct: first && expected['code:10000'] ? first.checksum === expected['code:10000'].Q7_path.checksum : undefined,
    checksum: first?.checksum,
    sample: first?.sample,
    wallMs: timings.length ? median(timings) : undefined,
  };
  log('code', JSON.stringify(result.code));
}

result.finishedAt = new Date().toISOString();
const out = args.out ?? join(tmpdir(), `rdf-bench-${args.variant}-${Date.now()}.json`);
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(result, null, 2));
log('wrote', out);
