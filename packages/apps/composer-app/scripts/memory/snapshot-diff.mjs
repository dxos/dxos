//
// Copyright 2026 DXOS.org
//

/**
 * Heap-snapshot constructor-count diff over time, per context.
 * Takes a snapshot of page + dedicated worker at t=wait1 and t=wait2 and prints
 * the constructors whose total self size grew the most.
 *
 * Usage: node snapshot-diff.mjs [url] [--wait1 60] [--wait2 420]
 */

import { chromium } from '@playwright/test';

const url = process.argv[2] ?? 'http://localhost:4173';
const arg = (name, dflt) => {
  const i = process.argv.indexOf(name);
  return i > 0 ? parseFloat(process.argv[i + 1]) : dflt;
};
const wait1 = arg('--wait1', 60);
const wait2 = arg('--wait2', 420);
const DEBUG_PORT = 9344;
const MB = (bytes) => +(bytes / (1024 * 1024)).toFixed(2);

class Cdp {
  #ws;
  #id = 0;
  #pending = new Map();
  #listeners = new Map();
  static async connect(wsUrl) {
    const c = new Cdp();
    c.#ws = new WebSocket(wsUrl);
    await new Promise((res, rej) => {
      c.#ws.addEventListener('open', res, { once: true });
      c.#ws.addEventListener('error', rej, { once: true });
    });
    c.#ws.addEventListener('message', ({ data }) => {
      const m = JSON.parse(data);
      if (m.id != null && c.#pending.has(m.id)) {
        const { resolve, reject } = c.#pending.get(m.id);
        c.#pending.delete(m.id);
        m.error ? reject(new Error(m.error.message)) : resolve(m.result);
      } else if (m.method && c.#listeners.has(m.method)) {
        for (const fn of c.#listeners.get(m.method)) fn(m.params);
      }
    });
    return c;
  }
  send(method, params = {}) {
    const id = ++this.#id;
    return new Promise((res, rej) => {
      this.#pending.set(id, { resolve: res, reject: rej });
      this.#ws.send(JSON.stringify({ id, method, params }));
    });
  }
  on(method, fn) {
    if (!this.#listeners.has(method)) this.#listeners.set(method, new Set());
    this.#listeners.get(method).add(fn);
  }
  off(method, fn) {
    this.#listeners.get(method)?.delete(fn);
  }
  close() {
    this.#ws.close();
  }
}

const listTargets = async () =>
  (await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`)).json()).filter(
    (t) => ['page', 'worker'].includes(t.type) && t.webSocketDebuggerUrl,
  );

// Take a snapshot and aggregate {constructorName -> {count,size}} in memory.
const snapshotAgg = async (t) => {
  const cdp = await Cdp.connect(t.webSocketDebuggerUrl);
  await cdp.send('HeapProfiler.enable');
  await cdp.send('HeapProfiler.collectGarbage');
  let json = '';
  const onChunk = ({ chunk }) => {
    json += chunk;
  };
  cdp.on('HeapProfiler.addHeapSnapshotChunk', onChunk);
  await cdp.send('HeapProfiler.takeHeapSnapshot', { reportProgress: false });
  cdp.off('HeapProfiler.addHeapSnapshotChunk', onChunk);
  cdp.close();
  const snap = JSON.parse(json);
  const nf = snap.snapshot.meta.node_fields;
  const nt = snap.snapshot.meta.node_types[0];
  const stride = nf.length;
  const TYPE = nf.indexOf('type');
  const NAME = nf.indexOf('name');
  const SELF = nf.indexOf('self_size');
  const agg = new Map();
  const { nodes, strings } = snap;
  for (let i = 0; i < nodes.length; i += stride) {
    const type = nt[nodes[i + TYPE]];
    let key;
    if (type === 'object' || type === 'closure' || type === 'native') key = `${type}:${strings[nodes[i + NAME]]}`;
    else if (type === 'string' || type === 'concatenated string' || type === 'sliced string') key = '(strings)';
    else key = `(${type})`;
    const cur = agg.get(key) ?? { count: 0, size: 0 };
    cur.count += 1;
    cur.size += nodes[i + SELF];
    agg.set(key, cur);
  }
  return agg;
};

const diff = (a, b, label) => {
  const rows = [];
  for (const [key, bv] of b) {
    const av = a.get(key) ?? { count: 0, size: 0 };
    rows.push({ key, dSize: bv.size - av.size, dCount: bv.count - av.count, bSize: bv.size, bCount: bv.count });
  }
  rows.sort((x, y) => y.dSize - x.dSize);
  console.log(`\n== ${label}: top constructors by self-size growth ==`);
  for (const r of rows.slice(0, 25)) {
    if (r.dSize < 50_000) continue;
    console.log(`  +${String(MB(r.dSize)).padStart(7)}MB (+${r.dCount} → ${r.bCount})  ${r.key.slice(0, 90)}`);
  }
};

const browser = await chromium.launch({ headless: true, args: [`--remote-debugging-port=${DEBUG_PORT}`] });
const page = await (await browser.newContext()).newPage();
console.log(`navigating to ${url} ...`);
await page.goto(url, { timeout: 180_000 });
await page.getByTestId('treeView.userAccount').waitFor({ timeout: 180_000 });

await page.waitForTimeout(wait1 * 1000);
const targetsA = await listTargets();
const aggsA = new Map();
for (const t of targetsA) {
  console.log(`snapshot A: ${t.type}`);
  aggsA.set(t.type, await snapshotAgg(t));
}

await page.waitForTimeout((wait2 - wait1) * 1000);
const targetsB = await listTargets();
for (const t of targetsB) {
  console.log(`snapshot B: ${t.type}`);
  const aggB = await snapshotAgg(t);
  const aggA = aggsA.get(t.type);
  if (aggA) diff(aggA, aggB, `${t.type} t=${wait1}s → t=${wait2}s`);
}

await browser.close();
