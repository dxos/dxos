//
// Copyright 2026 DXOS.org
//

/**
 * RSS soak with a BARE chromium — no Playwright page bindings, no CDP Network
 * domain, nothing enabled on the page target. Discriminates real app growth
 * from instrumentation-induced retention (DevTools/CDP network buffers).
 *
 * Usage: node plain-soak.mjs [url] [--minutes 10] [--interval 30]
 */

import { chromium } from '@playwright/test';
import { execSync, spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const url = process.argv[2] ?? 'http://localhost:4173';
const arg = (name, dflt) => {
  const i = process.argv.indexOf(name);
  return i > 0 ? parseFloat(process.argv[i + 1]) : dflt;
};
const minutes = arg('--minutes', 10);
const intervalS = arg('--interval', 30);
const DEBUG_PORT = 9345;
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

const exe = process.env.HEADLESS_SHELL ?? chromium.executablePath();
const profile = mkdtempSync(path.join(tmpdir(), 'plain-soak-'));
const child = spawn(
  exe,
  [
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=${profile}`,
    '--no-first-run',
    '--no-default-browser-check',
    'about:blank',
  ],
  { stdio: ['ignore', 'pipe', 'pipe'] },
);
child.stderr.on('data', (d) => process.stderr.write(d));
console.log(`bare chromium pid ${child.pid}`);

// The profile dir and the browser outlive a crash or a ctrl-c otherwise, and each run leaves a
// multi-hundred-MB directory behind.
let cleanedUp = false;
const cleanUp = () => {
  if (cleanedUp) {
    return;
  }
  cleanedUp = true;
  child.kill();
  rmSync(profile, { recursive: true, force: true });
};
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    cleanUp();
    process.exit(signal === 'SIGINT' ? 130 : 143);
  });
}

// Wait for the debug port.
for (let i = 0; i < 60; i++) {
  try {
    await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`)).json();
    break;
  } catch {
    await new Promise((r) => setTimeout(r, 500));
  }
}

// Navigate the first page target via CDP only.
const targets = await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`)).json();
const pageTarget = targets.find((t) => t.type === 'page');
const cdp = await Cdp.connect(pageTarget.webSocketDebuggerUrl);
await cdp.send('Page.enable');
await cdp.send('Page.navigate', { url });

// Wait for app-ready by polling the DOM (Runtime.evaluate only — no Network domain ever enabled).
let ready = false;
for (let i = 0; i < 240; i++) {
  const { result } = await cdp
    .send('Runtime.evaluate', {
      expression: `!!document.querySelector('[data-testid="treeView.userAccount"]')`,
      returnByValue: true,
    })
    .catch(() => ({ result: { value: false } }));
  if (result?.value) {
    ready = true;
    break;
  }
  await new Promise((r) => setTimeout(r, 1000));
}
if (!ready) {
  // Soaking a page that never loaded would report a flat, meaningless baseline.
  console.error(`app never reached ready at ${url}`);
  cleanUp();
  process.exit(1);
}
console.log('ready; soaking', minutes, 'min');
cdp.close();

const sampleRss = (rootPid) => {
  const out = execSync('ps -ax -o pid,ppid,rss,command', { maxBuffer: 32 * 1024 * 1024 }).toString();
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
  const acc = {};
  for (const pid of tree) {
    const p = byPid.get(pid);
    if (!p) {
      continue;
    }
    const type = (p.cmd.match(/--type=(\w+)/) || [])[1] ?? 'main';
    const key = type === 'renderer' ? `renderer.${pid}` : type;
    acc[key] = (acc[key] ?? 0) + MB(p.rss * 1024);
  }
  return acc;
};

const started = Date.now();
const rounds = Math.ceil((minutes * 60) / intervalS);
for (let round = 0; round <= rounds; round++) {
  const t = +((Date.now() - started) / 1000).toFixed(0);
  console.log(JSON.stringify({ t, ...sampleRss(child.pid) }));
  if (round < rounds) {
    await new Promise((r) => setTimeout(r, intervalS * 1000));
  }
}

cleanUp();
