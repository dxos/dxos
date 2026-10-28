//
// Copyright 2026 DXOS.org
//

/**
 * The space-switch scenario (`perf-space-switch.spec.ts`) in the system's WebKit, the engine the native app
 * embeds, through the WKWebView host `wkapp` (`swiftc -O scripts/memory/wkapp.swift -o ../../../.perf/wkapp`).
 * WebKit has no profiler protocol here, so a stage reports wall time, the WebContent process's CPU time, the
 * page's longest frame and its query recomputes.
 *
 * Usage: node scripts/memory/system-webkit-switch.ts --host <wkapp> --archive <file> --dist <offline bundle>
 *        --spaces <id>,<id> [--boots 3] [--passes cold,warm,revisit,reindex] [--port 4499] [--plugins <id>,<id>]
 */

import { execFileSync, spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { setTimeout as sleep } from 'node:timers/promises';
import { parseArgs } from 'node:util';

import { startPartitionProxy } from '@dxos/perf-harness';

import { servePreview } from './preview.ts';

const WORKSPACE_ROOT = path.resolve(import.meta.dirname, '../../../../..');
const SETTLE_MS = 20_000;
const EVICTION_IDLE_MS = 45_000;

const { values } = parseArgs({
  options: {
    host: { type: 'string' },
    archive: { type: 'string' },
    dist: { type: 'string' },
    spaces: { type: 'string' },
    boots: { type: 'string', default: '3' },
    passes: { type: 'string', default: 'cold,warm,revisit,reindex' },
    port: { type: 'string', default: '4499' },
    // Plugin ids to enable on top of the defaults, e.g. the reporter's own set.
    plugins: { type: 'string' },
  },
});
if (!values.host || !values.archive || !values.dist || !values.spaces) {
  throw new Error('usage: system-webkit-switch.ts --host <wkapp> --archive <file> --dist <bundle> --spaces <ids>');
}
const spaces = values.spaces.split(',').filter(Boolean);
const passes = values.passes.split(',');
const port = Number(values.port);
const origin = `http://127.0.0.1:${port}`;

type Reply = { id: string; ok: boolean; value?: string; error?: string };

const startHost = (proxyPort: number, store: string) => {
  const proc = spawn(path.resolve(values.host!), [String(proxyPort), store, path.resolve(values.archive!)], {
    stdio: ['pipe', 'pipe', 'inherit'],
  });
  const waiting = new Map<string, (reply: Reply) => void>();
  createInterface({ input: proc.stdout }).on('line', (line) => {
    const reply = JSON.parse(line) as Reply;
    waiting.get(reply.id)?.(reply);
    waiting.delete(reply.id);
  });
  const ready = new Promise<Reply>((resolve) => waiting.set('ready', resolve));
  let next = 0;
  const send = (command: Record<string, string>): Promise<Reply> =>
    new Promise((resolve) => {
      const id = String(next++);
      waiting.set(id, resolve);
      proc.stdin.write(`${JSON.stringify({ id, ...command })}\n`);
    });
  const load = async (url: string) => {
    const reply = await send({ op: 'load', url });
    if (!reply.ok) {
      throw new Error(`load ${url}: ${reply.error}`);
    }
  };
  const evaluate = async <T>(body: string): Promise<T> => {
    const reply = await send({ op: 'eval', js: `return JSON.stringify(await (async () => { ${body} })() ?? null);` });
    if (!reply.ok) {
      throw new Error(reply.error);
    }
    return JSON.parse(reply.value ?? 'null') as T;
  };
  const stop = async () => {
    proc.kill();
    await new Promise((resolve) => proc.once('exit', resolve));
    await sleep(3_000);
  };
  return { proc, ready, load, evaluate, stop };
};

const webkitPids = (): Set<number> => {
  try {
    return new Set(
      execFileSync('pgrep', ['-f', 'com.apple.WebKit.WebContent'], { encoding: 'utf8' })
        .split('\n')
        .filter(Boolean)
        .map(Number),
    );
  } catch {
    return new Set();
  }
};

/** CPU seconds a process has used, from `ps`'s `[[dd-]hh:]mm:ss.cc`. */
const cpuSeconds = (pid: number): number => {
  const text = execFileSync('ps', ['-o', 'time=', '-p', String(pid)], { encoding: 'utf8' }).trim();
  return text.split(/[-:]/).reduce((total, part) => total * 60 + Number(part), 0);
};

/** Resolves once the client's index status has read `idle` for `idleS` seconds running. */
const waitForIndexIdle = async (
  evaluate: <T>(body: string) => Promise<T>,
  { idleS = 5, timeoutS = 900 } = {},
): Promise<void> => {
  let idle = 0;
  let phase: string | undefined;
  for (let elapsed = 0; elapsed < timeoutS; elapsed++) {
    await sleep(1_000);
    phase = await evaluate<string | undefined>(`return globalThis.dxos.client.indexStatus.get()?.phase;`);
    idle = phase === 'idle' ? idle + 1 : 0;
    if (idle >= idleS) {
      return;
    }
  }
  throw new Error(`index still ${phase ?? 'unreported'} after ${timeoutS} s`);
};

/** Switches, then waits in the page until objects stop loading for a second; reports the page's view of it. */
const SWITCH = (workspace: string) => `
  const names = ['echo.objectDocumentsLoaded', 'echo.snapshotObjects', 'echo.queryRecomputes'];
  const read = () => { const c = globalThis.__dxosWorkCounters(); return names.map((n) => c[n] ?? 0); };
  const before = read();
  let frames = 0, maxGap = 0, longFrames = 0, longFrameMs = 0, lastLongFrameEnd = 0, last = performance.now(), running = true;
  const tick = (now) => { const gap = now - last; last = now; frames++; maxGap = Math.max(maxGap, gap); if (gap > 50) { longFrames++; longFrameMs += gap; lastLongFrameEnd = now - started; } if (running) requestAnimationFrame(tick); };
  requestAnimationFrame((now) => { last = now; requestAnimationFrame(tick); });
  globalThis.__switchTrace.length = 0;
  let firstMutation;
  const observer = new MutationObserver(() => { firstMutation ??= performance.now(); });
  observer.observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true });
  const started = performance.now();
  await globalThis.composer.invoke('org.dxos.operation.appToolkit.switchWorkspace', { subject: 'root/${workspace}' });
  const invokedMs = performance.now() - started;
  while (!location.pathname.includes('/w/${workspace}')) { await new Promise((r) => setTimeout(r, 20)); }
  const urlMs = performance.now() - started;
  observer.disconnect();
  const steps = { invoked: Math.round(invokedMs), firstMutation: firstMutation && Math.round(firstMutation - started) };
  let current = read().join(), quietSince = performance.now();
  while (performance.now() - quietSince < 1000) {
    await new Promise((r) => setTimeout(r, 100));
    const next = read().join();
    if (next !== current) { current = next; quietSince = performance.now(); }
  }
  running = false;
  const after = read();
  for (const [name, at] of globalThis.__switchTrace) { steps[name] ??= Math.round(at - started); }
  return { steps, urlMs: Math.round(urlMs), settledMs: Math.round(quietSince - started), maxFrameMs: Math.round(maxGap), longFrames, longFrameMs: Math.round(longFrameMs), lastLongFrameEndMs: Math.round(lastLongFrameEnd), frames, recomputes: after[2] - before[2], docs: after[0] - before[0] };
`;

/**
 * Marks each step of a switch in `__switchTrace`: the view transition's start, old-state capture, update settle and
 * animation, and the history write. `__setViewTransitions(false)` hides the API, so the app switches without one.
 */
const INSTALL_TRACE = `
  const trace = (globalThis.__switchTrace = []);
  const mark = (name) => trace.push([name, performance.now()]);
  const original = Document.prototype.startViewTransition;
  const traced = function (arg) {
    mark('vt.start');
    const update = typeof arg === 'function' ? arg : arg?.update;
    const wrapped = update && ((...args) => {
      mark('vt.captured');
      const result = update(...args);
      Promise.resolve(result).then(() => mark('vt.updateSettled'), () => {});
      return result;
    });
    const transition = original.call(this, typeof arg === 'function' ? wrapped : { ...arg, update: wrapped });
    transition.updateCallbackDone.then(() => mark('vt.updateDone'), () => {});
    transition.ready.then(() => mark('vt.ready'), () => mark('vt.aborted'));
    transition.finished.then(() => mark('vt.finished'), () => {});
    return transition;
  };
  globalThis.__setViewTransitions = (on) => {
    if (on) { Document.prototype.startViewTransition = traced; } else { delete Document.prototype.startViewTransition; }
  };
  globalThis.__setViewTransitions(!!original);
  for (const method of ['pushState', 'replaceState']) {
    const write = history[method].bind(history);
    history[method] = (...args) => { mark('history.' + method); return write(...args); };
  }
  return !!original;
`;

const main = async () => {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
  const outDir = path.join(WORKSPACE_ROOT, '.perf', 'system-webkit-switch', stamp);
  mkdirSync(outDir, { recursive: true, mode: 0o700 });
  const store = randomUUID();
  const preview = await servePreview(path.resolve(values.dist!), port);
  const proxy = await startPartitionProxy({ allow: [] });
  const before = webkitPids();
  const contentPid = () => {
    const pids = [...webkitPids()].filter((pid) => !before.has(pid));
    if (pids.length !== 1) {
      throw new Error(`expected one WebContent process of the host, found ${pids.length}`);
    }
    return pids[0];
  };
  const rows: unknown[] = [];

  let host = startHost(proxy.port, store);
  const boot = async () => {
    host = startHost(proxy.port, store);
    await host.ready;
    await host.load(`${origin}/?profiler=1&model=scripted`);
    for (let attempt = 0; ; attempt++) {
      const ready = await host
        .evaluate<boolean>(
          `return !!document.querySelector('[data-testid="treeView.userAccount"]') && ${JSON.stringify(spaces)}.every((id) => globalThis.dxos?.spaces?.().find((s) => s.id === id)?.state.get() === 3);`,
        )
        .catch(() => false);
      if (ready) {
        return;
      }
      if (attempt > 480) {
        throw new Error('the app never became ready');
      }
      await sleep(500);
    }
  };
  const switchSettled = async (workspace: string) => {
    for (let attempt = 0; attempt < 8; attempt++) {
      await host.evaluate(
        `await globalThis.composer.invoke('org.dxos.operation.appToolkit.switchWorkspace', { subject: 'root/${workspace}' }); return true;`,
      );
      for (let wait = 0; wait < 30; wait++) {
        if (await host.evaluate<boolean>(`return location.pathname.includes('/w/${workspace}');`)) {
          return;
        }
        await sleep(500);
      }
    }
    throw new Error(`switch to ${workspace} never landed`);
  };

  try {
    // Import, as the soak does: the host answers the file picker with the archive.
    await host.ready;
    await host.load(`${origin}/recovery.html`);
    for (let attempt = 0; attempt < 120; attempt++) {
      if (await host.evaluate<boolean>(`return !!globalThis.dxos?.recovery?.importSqlite;`).catch(() => false)) {
        break;
      }
      await sleep(500);
    }
    await host.evaluate(`await globalThis.dxos.recovery.importSqlite(); return true;`);
    await host.stop();

    // A returning boot: index every visited space once, then park on Settings.
    await boot();
    if (values.plugins) {
      const reply = await host.evaluate(
        `return await globalThis.composer.invoke('org.dxos.operation.registry.enablePlugins', { ids: ${JSON.stringify(values.plugins.split(','))} });`,
      );
      process.stdout.write(`plugins: ${JSON.stringify(reply)}\n`);
    }
    for (const spaceId of spaces) {
      await switchSettled(spaceId);
      await waitForIndexIdle(host.evaluate);
    }
    await switchSettled('dxos:settings');
    await host.stop();
    process.stdout.write('prepared\n');

    for (let iteration = 0; iteration < Number(values.boots); iteration++) {
      await boot();
      await sleep(SETTLE_MS);
      const pid = contentPid();
      const stage = async (id: string, body: () => Promise<unknown>) => {
        const cpu = cpuSeconds(pid);
        const started = Date.now();
        const page = await body();
        const row = {
          iteration,
          stage: id,
          wallMs: Date.now() - started,
          cpuMs: Math.round((cpuSeconds(pid) - cpu) * 1000),
          page,
        };
        rows.push(row);
        process.stdout.write(`${JSON.stringify(row)}\n`);
      };
      const transitions = await host.evaluate<boolean>(INSTALL_TRACE);
      process.stdout.write(`view transitions: ${transitions}\n`);
      // \`novt\` is a warm pass with the View Transitions API hidden; \`warm2\` repeats warm after it, to bound drift.
      for (const pass of ['cold', 'warm', 'novt', 'warm2', 'revisit'].filter((pass) => passes.includes(pass))) {
        if (pass === 'revisit') {
          await sleep(EVICTION_IDLE_MS);
        }
        await host.evaluate(`globalThis.__setViewTransitions(${pass !== 'novt' && transitions}); return true;`);
        for (const [index, spaceId] of spaces.entries()) {
          await stage(`${pass}-${index + 1}`, () => host.evaluate(SWITCH(spaceId)));
        }
      }
      if (passes.includes('reindex')) {
        await stage('reindex', async () => {
          await host.evaluate(`await globalThis.dxos.client.services.services.DevtoolsHost.runSqliteQuery({
            query: "DELETE FROM indexCursor WHERE indexName = 'objectSnapshot' AND sourceName = 'automerge'",
          }); return true;`);
          // The whole catch-up, not just the switch: every frame the page drew until the process went quiet.
          await host.evaluate(`
            const state = { frames: 0, maxGap: 0, longFrames: 0, longMs: 0, last: performance.now(), running: true };
            const tick = (now) => { const gap = now - state.last; state.last = now; state.frames++; state.maxGap = Math.max(state.maxGap, gap); if (gap > 50) { state.longFrames++; state.longMs += gap; } if (state.running) requestAnimationFrame(tick); };
            requestAnimationFrame(tick);
            globalThis.__switchFrames = state;
            return true;`);
          const page = await host.evaluate(SWITCH(spaces[0]));
          await waitForIndexIdle(host.evaluate);
          const frames = await host.evaluate(`
            const state = globalThis.__switchFrames; state.running = false;
            const c = globalThis.__dxosWorkCounters();
            return { frames: state.frames, maxFrameMs: Math.round(state.maxGap), longFrames: state.longFrames, longFrameMs: Math.round(state.longMs), recomputesTotal: c['echo.queryRecomputes'] };`);
          return { switch: page, catchUp: frames };
        });
      }
      await switchSettled('dxos:settings');
      await host.stop();
    }
  } finally {
    writeFileSync(path.join(outDir, 'rows.json'), JSON.stringify(rows, null, 2));
    process.stdout.write(`rows ${path.join(outDir, 'rows.json')}\n`);
    host.proc.kill();
    await sleep(2_000);
    // The imported profile lives in the host's data store and holds private keys; none of it may outlive the
    // run. The removal's completion handler does not always fire, so the directory is what is checked.
    const storeDir = path.join(
      homedir(),
      'Library/WebKit',
      path.basename(values.host!),
      'WebsiteDataStore',
      store.toUpperCase(),
    );
    try {
      execFileSync(path.resolve(values.host!), ['--remove', store], { stdio: 'ignore', timeout: 20_000 });
    } catch {
      // Checked below.
    }
    rmSync(storeDir, { recursive: true, force: true });
    if (existsSync(storeDir)) {
      process.stderr.write(`data store still on disk: ${storeDir}\n`);
    }
    await proxy.close();
    await preview.stop();
  }
};

await main();
