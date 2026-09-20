//
// Copyright 2026 DXOS.org
//

/**
 * Counts calls to a handful of allocation-heavy Web APIs, per realm, with the JS stack.
 *
 * `native-heap.mjs` names the C++ frame that allocated; this names the application code
 * that asked for it. The two together are what turned a 100 MB `<unspecified>` block into
 * a line number: the native profile said "ArrayBuffers under an IndexedDB callback", and
 * this said which worker, which store, and how many times a second.
 *
 * The shims are installed before any of the app's own script runs, in every realm —
 * including dedicated workers, which no CDP target list reports and which is where
 * Composer does most of this work.
 *
 * Usage: node api-census.mjs <url> [--settle 90] [--json out.json]
 */

import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const url = process.argv[2]?.startsWith('--') ? 'http://localhost:4173' : (process.argv[2] ?? 'http://localhost:4173');
const arg = (name, dflt) => {
  const i = process.argv.indexOf(name);
  return i > 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : dflt;
};
const settleS = parseFloat(arg('--settle', '90'));
const jsonOut = arg('--json', null);
const port = parseInt(process.env.API_CENSUS_PORT ?? '9471', 10);
const MB = (bytes) => +(bytes / (1024 * 1024)).toFixed(2);

/** Installed before the app's first script; idempotent, because realms get it twice. */
const PROBE = `(() => {
  if (globalThis.__apiCensus) { return; }
  const census = { encode: {}, query: {} };
  globalThis.__apiCensus = census;
  const note = (bucket, key, bytes) => {
    const entry = (census[bucket][key] ??= { bytes: 0, calls: 0 });
    entry.calls++;
    entry.bytes += bytes || 0;
  };
  // Six frames: enough to cross the bundler's wrappers and reach the caller that matters.
  const where = (skip) =>
    (new Error().stack || '')
      .split('\\n')
      .slice(skip, skip + 6)
      .map((line) => line.trim())
      .join(' | ');
  for (const proto of [IDBObjectStore.prototype, IDBIndex.prototype]) {
    for (const name of ['getAll', 'getAllKeys', 'getAllRecords', 'openCursor']) {
      const original = proto[name];
      if (!original) {
        continue;
      }
      proto[name] = function (...args) {
        let store = '?';
        try {
          const owner = this.objectStore ?? this;
          store = owner.transaction.db.name + '/' + owner.name;
        } catch {
          // A detached store still tells us the call happened.
        }
        note('query', name + ' ' + store + ' @ ' + where(2), 0);
        return original.apply(this, args);
      };
    }
  }
  const encode = TextEncoder.prototype.encode;
  TextEncoder.prototype.encode = function (input) {
    const out = encode.call(this, input);
    note('encode', where(2), out.byteLength);
    return out;
  };
  return true;
})()`;

class Cdp {
  #ws;
  #id = 0;
  #pending = new Map();
  #listeners = new Map();

  static async connect(wsUrl) {
    const cdp = new Cdp();
    cdp.#ws = new WebSocket(wsUrl);
    await new Promise((resolve, reject) => {
      cdp.#ws.addEventListener('open', resolve, { once: true });
      cdp.#ws.addEventListener('error', reject, { once: true });
    });
    cdp.#ws.addEventListener('message', ({ data }) => {
      const message = JSON.parse(data);
      if (message.id != null && cdp.#pending.has(message.id)) {
        const { resolve, reject } = cdp.#pending.get(message.id);
        cdp.#pending.delete(message.id);
        message.error ? reject(new Error(message.error.message)) : resolve(message.result);
      } else if (message.method) {
        for (const fn of cdp.#listeners.get(message.method) ?? []) {
          fn(message.params, message.sessionId);
        }
      }
    });
    cdp.#ws.addEventListener('close', () => {
      for (const { reject } of cdp.#pending.values()) {
        reject(new Error('CDP socket closed'));
      }
      cdp.#pending.clear();
    });
    return cdp;
  }

  send(method, params = {}, sessionId, timeoutMs = 60_000) {
    const id = ++this.#id;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.#pending.delete(id);
        reject(new Error(`${method} timed out after ${timeoutMs}ms`));
      }, timeoutMs);
      timer.unref?.();
      this.#pending.set(id, {
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        },
        resolve: (value) => {
          clearTimeout(timer);
          resolve(value);
        },
      });
      this.#ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
  }

  trySend(method, params, sessionId) {
    return this.send(method, params, sessionId).catch(() => undefined);
  }

  on(method, fn) {
    if (!this.#listeners.has(method)) {
      this.#listeners.set(method, new Set());
    }
    this.#listeners.get(method).add(fn);
  }
}

const profileDir = mkdtempSync(path.join(tmpdir(), 'api-census-'));
const child = spawn(
  chromium.executablePath(),
  [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profileDir}`,
    '--no-default-browser-check',
    '--no-first-run',
    '--renderer-process-limit=8',
    'about:blank',
  ],
  { stdio: 'ignore' },
);
child.on('error', (error) => {
  console.error(`could not run Chromium: ${error.message}`);
  rmSync(profileDir, { force: true, recursive: true });
  process.exit(1);
});
const shutdown = () => {
  child.kill('SIGKILL');
  rmSync(profileDir, { force: true, recursive: true });
};
for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(signal, () => {
    shutdown();
    process.exit(130);
  });
}

try {
  await new Promise((resolve) => setTimeout(resolve, 2500));
  const version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
  const browser = await Cdp.connect(version.webSocketDebuggerUrl);

  // Paused on start and re-armed per session: a realm that has already run its first
  // script cannot be instrumented, and auto-attach does not reach grandchildren.
  const realms = new Map();
  browser.on('Target.attachedToTarget', async ({ sessionId, targetInfo }) => {
    realms.set(sessionId, `${targetInfo.type}:${(targetInfo.url || '').split('/').pop()}`);
    await browser.trySend('Page.enable', {}, sessionId);
    await browser.trySend('Runtime.enable', {}, sessionId);
    await browser.trySend('Page.addScriptToEvaluateOnNewDocument', { source: PROBE }, sessionId);
    await browser.trySend('Runtime.evaluate', { expression: PROBE, returnByValue: true }, sessionId);
    await browser.trySend(
      'Target.setAutoAttach',
      { autoAttach: true, flatten: true, waitForDebuggerOnStart: true },
      sessionId,
    );
    await browser.trySend('Runtime.runIfWaitingForDebugger', {}, sessionId);
  });
  await browser.send('Target.setAutoAttach', { autoAttach: true, flatten: true, waitForDebuggerOnStart: true });

  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const page = targets.find((target) => target.type === 'page');
  if (!page) {
    throw new Error('no page target');
  }
  const cdp = await Cdp.connect(page.webSocketDebuggerUrl);
  await cdp.send('Page.enable');
  await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: PROBE });
  await cdp.send('Page.navigate', { url });
  console.error(`navigated; settling ${settleS}s ...`);
  await new Promise((resolve) => setTimeout(resolve, settleS * 1000));

  const collected = [];
  const read = async (label, send) => {
    const result = await send('Runtime.evaluate', {
      expression: 'JSON.stringify(globalThis.__apiCensus ?? null)',
      returnByValue: true,
    });
    const raw = result?.result?.value;
    if (raw && raw !== 'null') {
      collected.push({ data: JSON.parse(raw), label });
    }
  };
  await read('page', (method, params) => cdp.send(method, params));
  for (const [sessionId, label] of realms) {
    await read(label, (method, params) => browser.trySend(method, params, sessionId));
  }

  for (const { data, label } of collected) {
    const encode = Object.entries(data.encode).sort((a, b) => b[1].bytes - a[1].bytes);
    const query = Object.entries(data.query).sort((a, b) => b[1].calls - a[1].calls);
    const bytes = encode.reduce((sum, [, entry]) => sum + entry.bytes, 0);
    const calls = encode.reduce((sum, [, entry]) => sum + entry.calls, 0);
    const queries = query.reduce((sum, [, entry]) => sum + entry.calls, 0);
    if (!calls && !queries) {
      continue;
    }
    console.log(`\n=== ${label} — TextEncoder ${MB(bytes)} MB over ${calls} calls, ${queries} bulk IDB reads ===`);
    for (const [key, entry] of query.slice(0, 4)) {
      console.log(`  x${entry.calls}  ${key.slice(0, 260)}`);
    }
    for (const [key, entry] of encode.slice(0, 3)) {
      console.log(`  ${MB(entry.bytes)} MB over ${entry.calls} calls\n    ${key.slice(0, 320)}`);
    }
  }

  if (jsonOut) {
    writeFileSync(jsonOut, JSON.stringify({ collected, settleS, url }, null, 1));
    console.log(`\nwrote ${jsonOut}`);
  }
} finally {
  shutdown();
}
