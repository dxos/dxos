//
// Copyright 2026 DXOS.org
//

/**
 * Composer memory baseline harness.
 * Boots chromium with a remote-debugging port, loads Composer, waits for ready,
 * then measures the JS heap of EVERY execution context (page + shared /
 * dedicated / service workers) over per-target CDP websockets, forcing a GC
 * before each reading so numbers reflect live objects, not garbage.
 *
 * Usage: node measure.mjs [url] [--soak <seconds>] [--snapshot <dir>] [--keep-open]
 */

import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync, createWriteStream } from 'node:fs';
import path from 'node:path';

const url = process.argv[2] ?? 'http://localhost:5180';
const soakIdx = process.argv.indexOf('--soak');
const soakSeconds = soakIdx > 0 ? parseInt(process.argv[soakIdx + 1], 10) : 0;
const snapIdx = process.argv.indexOf('--snapshot');
const snapshotDir = snapIdx > 0 ? process.argv[snapIdx + 1] : null;

const DEBUG_PORT = 9333;
const MB = (bytes) => +(bytes / (1024 * 1024)).toFixed(1);

/** Minimal CDP client over one target's websocket. */
class Cdp {
  #ws;
  #id = 0;
  #pending = new Map();
  #listeners = new Map();

  static async connect(wsUrl) {
    const client = new Cdp();
    client.#ws = new WebSocket(wsUrl);
    await new Promise((resolve, reject) => {
      client.#ws.addEventListener('open', resolve, { once: true });
      client.#ws.addEventListener('error', reject, { once: true });
    });
    client.#ws.addEventListener('message', ({ data }) => {
      const msg = JSON.parse(data);
      if (msg.id != null && client.#pending.has(msg.id)) {
        const { resolve, reject } = client.#pending.get(msg.id);
        client.#pending.delete(msg.id);
        msg.error ? reject(new Error(`${msg.error.message}`)) : resolve(msg.result);
      } else if (msg.method && client.#listeners.has(msg.method)) {
        for (const fn of client.#listeners.get(msg.method)) fn(msg.params);
      }
    });
    return client;
  }

  send(method, params = {}) {
    const id = ++this.#id;
    return new Promise((resolve, reject) => {
      this.#pending.set(id, { resolve, reject });
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

const listTargets = async () => {
  const res = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`);
  return res.json();
};

const INTERESTING = new Set(['page', 'shared_worker', 'worker', 'service_worker']);
const describeTarget = (t) => `${t.type}: ${t.url.split('?')[0]}`;

const measureAll = async (label) => {
  const targets = (await listTargets()).filter((t) => INTERESTING.has(t.type) && t.webSocketDebuggerUrl);
  const rows = [];
  for (const t of targets) {
    try {
      const cdp = await Cdp.connect(t.webSocketDebuggerUrl);
      await cdp.send('HeapProfiler.enable').catch(() => {});
      await cdp.send('HeapProfiler.collectGarbage').catch(() => {});
      const usage = await cdp.send('Runtime.getHeapUsage');
      rows.push({
        label,
        target: describeTarget(t),
        id: t.id,
        usedMB: MB(usage.usedSize),
        totalMB: MB(usage.totalSize),
        ...(usage.embedderHeapUsedSize != null ? { embedderMB: MB(usage.embedderHeapUsedSize) } : {}),
        ...(usage.backingStorageSize != null ? { backingMB: MB(usage.backingStorageSize) } : {}),
      });
      cdp.close();
    } catch (err) {
      rows.push({ label, target: describeTarget(t), id: t.id, error: String(err?.message ?? err) });
    }
  }
  console.log(`\n== ${label} ==`);
  for (const row of rows) {
    if (row.error) console.log(`  ${row.target}  ERROR ${row.error}`);
    else {
      const extra = [
        row.embedderMB != null ? `embedder ${row.embedderMB}MB` : null,
        row.backingMB != null ? `backing ${row.backingMB}MB` : null,
      ]
        .filter(Boolean)
        .join(', ');
      console.log(`  ${row.target}  used ${row.usedMB}MB / total ${row.totalMB}MB${extra ? `  (${extra})` : ''}`);
    }
  }
  return rows;
};

const takeSnapshot = async (t, dir, tag) => {
  const cdp = await Cdp.connect(t.webSocketDebuggerUrl);
  await cdp.send('HeapProfiler.enable');
  await cdp.send('HeapProfiler.collectGarbage');
  mkdirSync(dir, { recursive: true });
  const safe = describeTarget(t)
    .replace(/[^a-z0-9]+/gi, '_')
    .slice(0, 80);
  const file = path.join(dir, `${tag}-${safe}.heapsnapshot`);
  const stream = createWriteStream(file);
  let bytes = 0;
  const onChunk = ({ chunk }) => {
    bytes += chunk.length;
    stream.write(chunk);
  };
  cdp.on('HeapProfiler.addHeapSnapshotChunk', onChunk);
  await cdp.send('HeapProfiler.takeHeapSnapshot', { reportProgress: false });
  cdp.off('HeapProfiler.addHeapSnapshotChunk', onChunk);
  await new Promise((resolve) => stream.end(resolve));
  console.log(`  snapshot -> ${file} (${MB(bytes)}MB raw)`);
  cdp.close();
  return file;
};

const browser = await chromium.launch({
  headless: true,
  args: [`--remote-debugging-port=${DEBUG_PORT}`],
});
const context = await browser.newContext();
const page = await context.newPage();

console.log(`navigating to ${url} ...`);
const start = Date.now();
await page.goto(url, { timeout: 180_000 });
await page.getByTestId('treeView.userAccount').waitFor({ timeout: 180_000 });
console.log(`ready in ${((Date.now() - start) / 1000).toFixed(1)}s`);
await page.waitForTimeout(5_000);

const results = [];
results.push(await measureAll('app-ready +5s'));

if (soakSeconds > 0) {
  await page.waitForTimeout(soakSeconds * 1000);
  results.push(await measureAll(`idle soak +${soakSeconds}s`));
}

if (snapshotDir) {
  const targets = (await listTargets()).filter(
    (t) => ['page', 'shared_worker', 'worker'].includes(t.type) && t.webSocketDebuggerUrl,
  );
  for (const t of targets) {
    await takeSnapshot(t, snapshotDir, 'baseline');
  }
}

writeFileSync(
  path.join(path.dirname(new URL(import.meta.url).pathname), 'last-run.json'),
  JSON.stringify(results.flat(), null, 2),
);

if (process.argv.includes('--keep-open')) {
  console.log('keeping browser open (ctrl-c to exit)');
  await new Promise(() => {});
}
await browser.close();
