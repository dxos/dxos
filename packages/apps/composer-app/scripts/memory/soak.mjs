//
// Copyright 2026 DXOS.org
//

/**
 * Long-soak memory tracker: samples JS heap (no forced GC — observe true growth),
 * backing store, and OS-level RSS of every chromium child process, every
 * `interval` seconds for `minutes` minutes. Prints a CSV-ish timeline.
 *
 * Usage: node soak.mjs [url] [--minutes 10] [--interval 15]
 */

import { chromium } from '@playwright/test';
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import path from 'node:path';

const url = process.argv[2] ?? 'http://localhost:4173';
const arg = (name, dflt) => {
  const i = process.argv.indexOf(name);
  return i > 0 ? parseFloat(process.argv[i + 1]) : dflt;
};
const minutes = arg('--minutes', 10);
const intervalS = arg('--interval', 15);
const blockIdx = process.argv.indexOf('--block');
const blockPattern = blockIdx > 0 ? process.argv[blockIdx + 1] : null;
const stubPerf = process.argv.includes('--stub-perf');
const STUB = `(() => { try { performance.clearMeasures(); performance.clearMarks(); performance.measure = () => undefined; performance.mark = () => undefined; } catch {} })()`;

const DEBUG_PORT = parseInt(process.env.SOAK_PORT ?? '9334', 10);
const MB = (bytes) => +(bytes / (1024 * 1024)).toFixed(1);

class Cdp {
  #ws;
  #id = 0;
  #pending = new Map();
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
  close() {
    this.#ws.close();
  }
}

const listTargets = async () => await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`)).json();
const INTERESTING = new Set(['page', 'shared_worker', 'worker', 'service_worker']);
const shortName = (t) => {
  const base = t.url.split('?')[0].split('/').pop() || t.type;
  return `${t.type === 'page' ? 'page' : base}`;
};

// RSS of every process in the launched chromium's tree, keyed by role.
const sampleRss = (rootPid) => {
  const out = execSync(`ps -ax -o pid,ppid,rss,command | awk '{print}'`, { maxBuffer: 32 * 1024 * 1024 }).toString();
  const rows = out
    .split('\n')
    .slice(1)
    .map((l) => l.trim().split(/\s+/))
    .filter((p) => p.length > 3);
  const byPid = new Map(rows.map((p) => [p[0], { ppid: p[1], rss: parseInt(p[2], 10), cmd: p.slice(3).join(' ') }]));
  const tree = new Set([String(rootPid)]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const [pid, { ppid }] of byPid) {
      if (!tree.has(pid) && tree.has(ppid)) {
        tree.add(pid);
        grew = true;
      }
    }
  }
  const procs = [];
  for (const pid of tree) {
    const p = byPid.get(pid);
    if (!p) continue;
    const type = (p.cmd.match(/--type=(\w+)/) || [])[1] ?? 'main';
    procs.push({ pid, type, rssMB: MB(p.rss * 1024) });
  }
  return procs;
};

const browser = await chromium.launch({ headless: true, args: [`--remote-debugging-port=${DEBUG_PORT}`] });
const context = await browser.newContext();
if (blockPattern) {
  await context.route(`**${blockPattern}**`, (route) => route.abort());
  console.log(`blocking requests matching *${blockPattern}*`);
}
const page = await context.newPage();

console.log(`navigating to ${url} ...`);
await page.goto(url, { timeout: 180_000 });
await page.getByTestId('treeView.userAccount').waitFor({ timeout: 180_000 });
console.log('ready; soaking', minutes, 'min at', intervalS, 's intervals');

// Root chromium pid: the process carrying our unique debug-port argument.
const rootPid = execSync(
  `ps -ax -o pid,command | grep -- "--remote-debugging-port=${DEBUG_PORT}" | grep -v grep | awk '{print $1}' | head -1`,
)
  .toString()
  .trim();

const samples = [];
const started = Date.now();
const rounds = Math.ceil((minutes * 60) / intervalS);
const stubbed = new Set();
for (let round = 0; round <= rounds; round++) {
  const t = +((Date.now() - started) / 1000).toFixed(0);
  const row = { t };
  try {
    const targets = (await listTargets()).filter((x) => INTERESTING.has(x.type) && x.webSocketDebuggerUrl);
    for (const target of targets) {
      try {
        const cdp = await Cdp.connect(target.webSocketDebuggerUrl);
        if (stubPerf && !stubbed.has(target.id)) {
          await cdp.send('Runtime.evaluate', { expression: STUB });
          stubbed.add(target.id);
        }
        const usage = await cdp.send('Runtime.getHeapUsage');
        row[`${shortName(target)}.used`] = MB(usage.usedSize);
        row[`${shortName(target)}.backing`] = usage.backingStorageSize != null ? MB(usage.backingStorageSize) : null;
        cdp.close();
      } catch {
        /* target gone mid-sample */
      }
    }
  } catch {
    /* debug port hiccup */
  }
  if (rootPid) {
    for (const p of sampleRss(rootPid)) {
      const key = `rss.${p.type}${p.type === 'renderer' ? `.${p.pid}` : ''}`;
      row[key] = (row[key] ?? 0) + p.rssMB;
    }
  }
  samples.push(row);
  console.log(JSON.stringify(row));
  if (round < rounds) await page.waitForTimeout(intervalS * 1000);
}

writeFileSync(
  path.join(path.dirname(new URL(import.meta.url).pathname), 'soak-run.json'),
  JSON.stringify(samples, null, 2),
);
await browser.close();
