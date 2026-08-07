//
// Copyright 2026 DXOS.org
//

/**
 * Native memory attribution: takes Chrome memory-infra dumps at two points in
 * time and prints per-process allocator sizes + the delta, naming which native
 * allocator grows while the JS heap stays flat.
 *
 * Usage: node memory-dump.mjs [url] [--wait1 60] [--wait2 480]
 */

import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import path from 'node:path';

const url = process.argv[2] ?? 'http://localhost:4173';
const arg = (name, dflt) => {
  const i = process.argv.indexOf(name);
  return i > 0 ? parseFloat(process.argv[i + 1]) : dflt;
};
const wait1 = arg('--wait1', 60);
const wait2 = arg('--wait2', 480);
const DEBUG_PORT = 9337;
const MB = (bytes) => +(bytes / (1024 * 1024)).toFixed(1);

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
  close() {
    this.#ws.close();
  }
}

// One memory-infra dump: returns { pid: { allocatorPath: bytes } }.
const takeDump = async (browserWs) => {
  const events = [];
  const cdp = await Cdp.connect(browserWs);
  cdp.on('Tracing.dataCollected', ({ value }) => {
    // Pushed one at a time: a dump's batch runs to tens of thousands of events, past the
    // argument limit a spread would hit.
    for (const event of value) {
      events.push(event);
    }
  });
  const done = new Promise((res) => cdp.on('Tracing.tracingComplete', res));
  await cdp.send('Tracing.start', {
    traceConfig: { includedCategories: ['disabled-by-default-memory-infra'], excludedCategories: ['*'] },
    transferMode: 'ReportEvents',
  });
  await cdp
    .send('Tracing.requestMemoryDump', { levelOfDetail: 'detailed' })
    .catch((err) => console.error('dump failed:', err.message));
  await new Promise((r) => setTimeout(r, 2000));
  await cdp.send('Tracing.end');
  await done;
  cdp.close();

  const byPid = {};
  for (const ev of events) {
    if (ev.ph !== 'v' || !ev.args?.dumps?.allocators) continue;
    const pid = ev.pid;
    byPid[pid] ??= {};
    for (const [name, node] of Object.entries(ev.args.dumps.allocators)) {
      const size = node.attrs?.effective_size ?? node.attrs?.size;
      if (!size) continue;
      const bytes = parseInt(size.value, 16);
      if (!Number.isFinite(bytes)) continue;
      byPid[pid][name] = bytes;
    }
  }
  return byPid;
};

// Roll up to depth-2 allocator paths, keeping only rows that matter.
const rollup = (allocators) => {
  const out = new Map();
  for (const [pathName, bytes] of Object.entries(allocators)) {
    const parts = pathName.split('/');
    // Effective sizes are hierarchical; take only top-level nodes to avoid double count,
    // but keep depth-2 for v8 + malloc + blink for detail.
    if (parts.length === 1) out.set(parts[0], (out.get(parts[0]) ?? 0) + bytes);
  }
  return out;
};

const browser = await chromium.launch({ headless: true, args: [`--remote-debugging-port=${DEBUG_PORT}`] });
const context = await browser.newContext();
const page = await context.newPage();

console.log(`navigating to ${url} ...`);
await page.goto(url, { timeout: 180_000 });
await page.getByTestId('treeView.userAccount').waitFor({ timeout: 180_000 });

const version = await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`)).json();
const browserWs = version.webSocketDebuggerUrl;

// Optionally stub the performance timeline in every context and verify counts.
const stubPerf = process.argv.includes('--stub-perf');
const STUB = `(() => { try { performance.clearMeasures(); performance.clearMarks(); performance.measure = () => undefined; performance.mark = () => undefined; return 'stubbed'; } catch (e) { return String(e); } })()`;
const COUNT = `JSON.stringify({ m: performance.getEntriesByType('measure').length, k: performance.getEntriesByType('mark').length })`;
const evalAll = async (expr, label) => {
  const targets = (await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`)).json()).filter(
    (t) => ['page', 'worker', 'shared_worker'].includes(t.type) && t.webSocketDebuggerUrl,
  );
  for (const t of targets) {
    try {
      const cdp = await Cdp.connect(t.webSocketDebuggerUrl);
      const { result } = await cdp.send('Runtime.evaluate', { expression: expr, returnByValue: true });
      console.log(
        `${label} ${t.type}:${(t.url.split('/').pop() || '').slice(0, 40)} -> ${JSON.stringify(result.value)}`,
      );
      cdp.close();
    } catch (err) {
      console.log(`${label} ${t.type}: ERR ${err.message}`);
    }
  }
};
if (stubPerf) await evalAll(STUB, 'stub');

await page.waitForTimeout(wait1 * 1000);
console.log(`\n=== dump A at t=+${wait1}s ===`);
const dumpA = await takeDump(browserWs);

await page.waitForTimeout((wait2 - wait1) * 1000);
console.log(`\n=== dump B at t=+${wait2}s ===`);
const dumpB = await takeDump(browserWs);
if (stubPerf) await evalAll(COUNT, 'entries-at-B');

// Renderer = the pid with a v8 allocator and the largest total.
const report = {};
for (const pid of Object.keys(dumpB)) {
  const a = dumpA[pid] ? rollup(dumpA[pid]) : new Map();
  const b = rollup(dumpB[pid]);
  const rows = [...b.entries()]
    .map(([name, bytes]) => ({ name, aMB: MB(a.get(name) ?? 0), bMB: MB(bytes), dMB: MB(bytes - (a.get(name) ?? 0)) }))
    .sort((x, y) => y.dMB - x.dMB);
  const total = rows.reduce((sum, r) => sum + r.bMB, 0);
  report[pid] = rows;
  console.log(`\n-- pid ${pid} (total ~${total.toFixed(0)}MB at B) --`);
  for (const r of rows) {
    if (r.bMB < 1 && Math.abs(r.dMB) < 1) continue;
    console.log(
      `  ${r.name.padEnd(24)} A ${String(r.aMB).padStart(8)}MB  B ${String(r.bMB).padStart(8)}MB  Δ ${String(r.dMB).padStart(8)}MB`,
    );
  }
}

// Detail: for the biggest-delta pid, print depth-2 for the top-level allocator that grew most.
let worstPid = null,
  worstDelta = -Infinity,
  worstAlloc = null;
for (const [pid, rows] of Object.entries(report)) {
  for (const r of rows) {
    if (r.dMB > worstDelta) {
      worstDelta = r.dMB;
      worstPid = pid;
      worstAlloc = r.name;
    }
  }
}
if (worstPid && dumpB[worstPid]) {
  console.log(`\n-- detail: pid ${worstPid} allocator '${worstAlloc}' (depth<=3) --`);
  const aAll = dumpA[worstPid] ?? {};
  const rows = Object.entries(dumpB[worstPid])
    .filter(([n]) => n.startsWith(`${worstAlloc}/`) && n.split('/').length <= 3)
    .map(([n, bytes]) => ({ n, bMB: MB(bytes), dMB: MB(bytes - (aAll[n] ?? 0)) }))
    .sort((x, y) => y.dMB - x.dMB)
    .slice(0, 20);
  for (const r of rows)
    console.log(`  ${r.n.padEnd(48)} B ${String(r.bMB).padStart(8)}MB  Δ ${String(r.dMB).padStart(8)}MB`);
}

writeFileSync(
  path.join(path.dirname(new URL(import.meta.url).pathname), 'memdump-run.json'),
  JSON.stringify({ dumpA, dumpB }, null, 2),
);
await browser.close();
