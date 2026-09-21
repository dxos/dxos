//
// Copyright 2026 DXOS.org
//

/**
 * Reconciled memory ledger: private footprint per process, split into the
 * allocator nodes that account for it, resident wasm, and the residual.
 *
 * Private footprint is the only quantity that sees everything — memory-infra has
 * no wasm dump provider, so `BackingStore::AllocateWasmMemory` pages appear in no
 * allocator node and a `WebAssembly` shim per realm is what names them.
 *
 * Usage: node ledger.mjs [url] [--detached] [--work] [--settle 60]
 *          [--baseline prior.json] [--snapshot] [--raw raw.json] [--vmmap vm.txt]
 *          [--ready testid] [--no-probe] [--json out.json]
 */

import { chromium } from '@playwright/test';
import { execFileSync, spawn } from 'node:child_process';
import { closeSync, mkdtempSync, openSync, readFileSync, rmSync, writeFileSync, writeSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import * as GraphPath from '@dxos/app-toolkit/GraphPath';

import { attributeSamples, createResolver } from './heap-attribution.mjs';
import { WASM_PROBE } from './probes.mjs';

/**
 * Restated rather than imported from `plugin-projects`, whose module graph every
 * run would then pay for and whose `paths` module is not an exported subpath.
 */
const getProjectPath = (spaceId, projectId) =>
  GraphPath.getSpacePath(spaceId, GraphPath.GroupSegments.ai, 'org.dxos.type.project', projectId);

const url = process.argv[2]?.startsWith('--') ? 'http://localhost:4173' : (process.argv[2] ?? 'http://localhost:4173');
const arg = (name, dflt) => {
  const i = process.argv.indexOf(name);
  const value = i > 0 ? process.argv[i + 1] : undefined;
  return value === undefined || value.startsWith('--') ? dflt : value;
};
const settleS = parseFloat(arg('--settle', '60'));
const jsonOut = arg('--json', null);
// `none` for a page with no such marker, which is how the probe itself is tested.
const readyTestId = arg('--ready', 'treeView.userAccount');
const noProbe = process.argv.includes('--no-probe');
// Boot alone otherwise, which is the floor rather than a working app.
const work = process.argv.includes('--work');
/**
 * Drive the page over a `Runtime`-only session instead of Playwright, whose page
 * costs this app ~130MB of Blink retaining response bodies for a client that
 * might ask for them. Excludes `--work`, which needs Playwright's page API.
 */
const detached = process.argv.includes('--detached');
/**
 * A previous run's JSON to subtract, which is the only way to attribute
 * `partition_alloc/allocated_objects/<unspecified>`: no dump provider claims it
 * and no instrument decomposes it, so a smaller app on the same SDK splits it.
 */
const baselineFile = arg('--baseline', null);
// Every raw dump event, for offline analysis that would otherwise cost a re-run.
const rawOut = arg('--raw', null);
// Full `vmmap` of the app renderer, for attributing regions no allocator names.
const vmOut = arg('--vmmap', null);
// Heap snapshots name what memory-infra reports as `<unspecified>`; off by
// default because a snapshot of a loaded tab costs ~30s and several GB to parse.
const snapshots = process.argv.includes('--snapshot');
/**
 * Sample allocation stacks, so the ledger can say which package allocated the
 * memory. Sampled rather than tracked per object: `trackAllocations` records a
 * stack for every allocation and makes this app's boot take over ten minutes.
 */
const byCode = process.argv.includes('--by-code');
const distDir = arg('--dist', 'out/composer');
// Only the last checkpoint: a snapshot per realm per checkpoint is minutes of
// wall clock and gigabytes of parse, and the composition question is about the
// state the journey ends in.
const snapshotAt = work ? 'edit-document' : 'boot';

const DEBUG_PORT = parseInt(process.env.LEDGER_PORT ?? '9338', 10);
const MB = (bytes) => +(bytes / (1024 * 1024)).toFixed(1);

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
    return cdp;
  }

  /**
   * Bounded, because a session that never answers otherwise stops the whole run.
   *
   * A paused target and a domain the target does not implement both present as
   * silence, and neither is worth a hung measurement.
   */
  send(method, params = {}, sessionId, timeoutMs = 30_000) {
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

  close() {
    this.#ws.close();
  }
}

/**
 * One detailed dump keyed by pid, merging the separate events that carry the OS
 * totals and the allocator tree for the same process.
 */
const takeDump = async (pageWs, rawLabel = 'dump') => {
  const events = [];
  const cdp = await Cdp.connect(pageWs);
  cdp.on('Tracing.dataCollected', ({ value }) => {
    for (const event of value) {
      events.push(event);
    }
  });
  const complete = new Promise((resolve) => cdp.on('Tracing.tracingComplete', resolve));
  await cdp.send('Tracing.start', {
    traceConfig: {
      includedCategories: ['disabled-by-default-memory-infra', 'disabled-by-default-devtools.timeline'],
      excludedCategories: ['*'],
    },
    transferMode: 'ReportEvents',
  });
  // `deterministic` forces a GC first, so the ledger describes live memory.
  await cdp.send('Tracing.requestMemoryDump', { deterministic: true, levelOfDetail: 'detailed' });
  await new Promise((resolve) => setTimeout(resolve, 3000));
  await cdp.send('Tracing.end');
  await Promise.race([complete, new Promise((resolve) => setTimeout(resolve, 60_000))]);
  cdp.close();

  const byPid = {};
  const frames = [];
  const kindByPid = {};
  for (const event of events) {
    // `process_name` rather than `thread_name`, because it is the only event that
    // names a utility process's service; `SystemInfo.getProcessInfo` carries no pid
    // the dump can be joined on at all.
    if (event.ph === 'M' && event.name === 'process_name') {
      // Normalized, because the names carry a suffix (`GPU Process`) and a utility
      // process is named for the service it runs (`Storage Service`).
      kindByPid[event.pid] = String(event.args?.name ?? '')
        .toLowerCase()
        .replace(/ (process|service)$/, '');
    }
    // The only place a renderer pid is joined to a frame: no CDP call returns it,
    // and `TracingStartedInBrowser` restates the whole frame set at trace start.
    const frameData = event.args?.data;
    if (event.name === 'TracingStartedInBrowser') {
      frames.push(...(frameData?.frames ?? []));
    } else if (event.name === 'FrameCommittedInBrowser' || event.name === 'ProcessReadyInBrowser') {
      frames.push(frameData);
    }
    const dumps = event.args?.dumps;
    if (event.ph !== 'v' || !dumps) {
      continue;
    }
    byPid[event.pid] ??= { allocators: {}, attrs: {}, graph: null, totals: null };
    if (dumps.allocators_graph) {
      byPid[event.pid].graph = dumps.allocators_graph;
    }
    if (dumps.process_totals) {
      byPid[event.pid].totals = dumps.process_totals;
    }
    for (const [name, node] of Object.entries(dumps.allocators ?? {})) {
      // Hex without an `0x` prefix, throughout memory-infra.
      const raw = node.attrs?.effective_size ?? node.attrs?.size;
      const bytes = raw ? parseInt(raw.value, 16) : NaN;
      if (Number.isFinite(bytes)) {
        byPid[event.pid].allocators[name] = bytes;
        // Which attribute answered, because a node carrying only `size` has not
        // been through the graph processor and may restate memory another node owns.
        byPid[event.pid].attrs[name] = {
          effective: node.attrs?.effective_size != null,
          guid: node.guid,
        };
      }
    }
  }
  if (rawOut) {
    const file = rawOut.replace(/(\.[^.]+)?$/, `-${rawLabel}$1`);
    writeFileSync(file, JSON.stringify(byPid));
    console.log(`  wrote raw dump ${file}`);
  }
  return { byPid, kindByPid, frames: frames.filter((frame) => frame?.processId) };
};

if (detached && work) {
  throw new Error('--work drives the page through Playwright, which --detached exists to avoid');
}

const LAUNCH_ARGS = [
  `--remote-debugging-port=${DEBUG_PORT}`,
  // Pinned because the default derives from installed RAM, so renderers
  // consolidate differently on a 16 GB and a 64 GB machine.
  '--renderer-process-limit=8',
  '--window-size=1440,900',
  // Otherwise `performance.memory` is bucketed to 3 significant figures, which
  // is too coarse for the external-memory subtraction below.
  '--enable-precise-memory-info',
];

/**
 * A profile to reuse rather than a throwaway one, so `--snapshot` can name what a tab holds
 * when it has data in it. `seed-profile.mjs` builds one.
 */
const persistentProfile = arg('--profile', null);
const profileDir = detached
  ? persistentProfile
    ? path.resolve(persistentProfile)
    : mkdtempSync(path.join(tmpdir(), 'ledger-profile-'))
  : null;
let child;
let browser;
if (detached) {
  child = spawn(
    chromium.executablePath(),
    [
      '--headless=new',
      ...LAUNCH_ARGS,
      `--user-data-dir=${profileDir}`,
      '--no-default-browser-check',
      '--no-first-run',
      // Opened blank and navigated below, so the probe is installed before the
      // app's first script rather than racing it.
      'about:blank',
    ],
    { stdio: 'ignore' },
  );
  await new Promise((resolve) => setTimeout(resolve, 2000));
} else {
  browser = await chromium.launch({
    headless: true,
    // The full browser rather than the headless shell, whose process consolidation
    // differs: the shell is not the chrome embedder.
    channel: 'chromium',
    args: LAUNCH_ARGS,
  });
}

const snapshotDir = snapshots ? mkdtempSync(path.join(tmpdir(), 'ledger-snap-')) : null;
const resolvePackage = byCode ? createResolver(distDir) : () => null;

const shutdown = () => {
  if (snapshotDir) {
    rmSync(snapshotDir, { force: true, recursive: true });
  }
  // A profile the caller passed in is an input, never removed.
  if (profileDir && !persistentProfile) {
    rmSync(profileDir, { force: true, recursive: true });
  }
  child?.kill('SIGKILL');
  return browser?.close();
};

try {
  const version = await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`)).json();
  const browserCdp = await Cdp.connect(version.webSocketDebuggerUrl);

  // Held constant for the run: a pressure notification mid-measurement purges caches
  // and the ledger then describes a state no user is ever in.
  await browserCdp.trySend('Memory.setPressureNotificationsSuppressed', { suppressed: true });

  // Auto-attach paused, so the probe is installed before a realm runs its first
  // script — a worker that has already instantiated its module is unrecoverable.
  browserCdp.on('Target.attachedToTarget', async ({ sessionId, targetInfo }) => {
    if (['iframe', 'page', 'service_worker', 'shared_worker', 'worker'].includes(targetInfo.type)) {
      await browserCdp.trySend('Page.enable', {}, sessionId);
      await browserCdp.trySend('Runtime.enable', {}, sessionId);
      // Both, because neither alone covers every realm: the init script survives a
      // navigation the page has not made yet, and the evaluate catches a worker,
      // which has no document to install one against.
      await browserCdp.trySend('Page.addScriptToEvaluateOnNewDocument', { source: WASM_PROBE }, sessionId);
      await browserCdp.trySend('Runtime.evaluate', { expression: WASM_PROBE, returnByValue: true }, sessionId);
      if (byCode) {
        await browserCdp.trySend('HeapProfiler.enable', {}, sessionId);
        await browserCdp.trySend('HeapProfiler.startSampling', { samplingInterval: 16384 }, sessionId);
      }
    }
    await browserCdp.trySend('Runtime.runIfWaitingForDebugger', {}, sessionId);
  });
  if (!noProbe) {
    await browserCdp.send('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: true, flatten: true });
  }

  /**
   * Installs the probe into any realm that lacks it, repeatedly.
   *
   * A dedicated worker attaches through its creating page's session, not the
   * browser's, and taking that session's auto-attach away from Playwright deadlocks
   * boot. Polling wins the only race that matters — a worker instantiates its
   * module well after the target appears — and the probe is idempotent.
   */
  const probeNewRealms = async () => {
    const seen = new Set();
    const pass = async () => {
      const targets = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`)
        .then((response) => response.json())
        .catch(() => []);
      for (const target of targets) {
        if (seen.has(target.id) || !target.webSocketDebuggerUrl || target.type === 'page') {
          continue;
        }
        seen.add(target.id);
        const cdp = await Cdp.connect(target.webSocketDebuggerUrl).catch(() => undefined);
        if (!cdp) {
          continue;
        }
        await cdp.trySend('Runtime.evaluate', { expression: WASM_PROBE, returnByValue: true });
        // Armed before the realm's first allocation, which is the only point from
        // which the profile can cover boot.
        if (byCode) {
          await cdp.trySend('HeapProfiler.enable');
          await cdp.trySend('HeapProfiler.startSampling', { samplingInterval: 16384 });
        }
        cdp.close();
      }
    };
    const timer = setInterval(() => void pass().catch(() => {}), 50);
    timer.unref?.();
    return () => clearInterval(timer);
  };

  /** The page target, whichever way the browser was started. */
  const findPageTarget = async () => {
    for (let attempt = 0; attempt < 60; attempt++) {
      const targets = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`)
        .then((response) => response.json())
        .catch(() => []);
      const target = targets.find((candidate) => candidate.type === 'page' && candidate.webSocketDebuggerUrl);
      if (target) {
        return target;
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    throw new Error('no page target appeared');
  };

  /**
   * The two ways to drive the page, behind one shape.
   *
   * Detached evaluates over a `Runtime`-only session, which is the whole point:
   * the domains Playwright needs are what cost the memory being measured.
   */
  let page;
  let driver;
  if (detached) {
    const target = await findPageTarget();
    const pageCdp = await Cdp.connect(target.webSocketDebuggerUrl);
    await pageCdp.trySend('Runtime.enable');
    await pageCdp.trySend('Page.enable');
    await pageCdp.trySend('Page.addScriptToEvaluateOnNewDocument', { source: WASM_PROBE });
    await pageCdp.trySend('Runtime.evaluate', { expression: WASM_PROBE, returnByValue: true });
    if (byCode) {
      await pageCdp.trySend('HeapProfiler.enable');
      await pageCdp.trySend('HeapProfiler.startSampling', { samplingInterval: 16384 });
    }
    const evaluate = async (expression) => {
      const result = await pageCdp.trySend('Runtime.evaluate', { expression, returnByValue: true });
      return result?.result?.value;
    };
    driver = {
      evaluate,
      navigate: (target) => pageCdp.trySend('Page.navigate', { url: target }),
      url: async () => (await evaluate('location.href')) ?? '',
      waitForReady: async (testId) => {
        for (let attempt = 0; attempt < 720; attempt++) {
          if (await evaluate(`!!document.querySelector('[data-testid="${testId}"]')`)) {
            return;
          }
          await new Promise((resolve) => setTimeout(resolve, 250));
        }
        throw new Error(`timed out waiting for ${testId}`);
      },
    };
  } else {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    page = await context.newPage();
    // Through CDP rather than `page.evaluate`, so both drivers evaluate an expression STRING the
    // same way. `page.evaluate` takes a function, and bridging a string through it needs an `eval`
    // in the page.
    const playwrightCdp = await context.newCDPSession(page);
    driver = {
      evaluate: async (expression) => {
        const result = await playwrightCdp
          .send('Runtime.evaluate', { expression, returnByValue: true })
          .catch(() => undefined);
        return result?.result?.value;
      },
      navigate: (target) => page.goto(target, { timeout: 180_000 }),
      url: async () => page.url(),
      waitForReady: (testId) => page.getByTestId(testId).waitFor({ timeout: 180_000 }),
    };
  }
  const stopProbing = noProbe ? () => {} : await probeNewRealms();
  console.log(`navigating to ${url} ...`);
  if (detached) {
    await driver.navigate(url);
  } else {
    await page.goto(url, { timeout: 180_000 });
  }
  if (readyTestId !== 'none') {
    await driver.waitForReady(readyTestId);
  }
  console.log(`app ready; settling ${settleS}s ...`);
  await new Promise((resolve) => setTimeout(resolve, settleS * 1000));
  stopProbing();

  /**
   * Per realm, because a shared worker runs in its creator's process.
   *
   * `RenderFrameHostImpl` allocates a dedicated worker in the creating context's
   * renderer and a shared worker takes the creator's `SiteInstance`, so a
   * per-process reading cannot separate ECHO's worker from the tab that spawned it.
   */
  /**
   * Names a realm's memory by taking a heap snapshot and attributing it.
   *
   * Written to disk and parsed by a separate process: a loaded tab's snapshot is
   * hundreds of megabytes of JSON, which neither fits a single string comfortably
   * nor parses inside the default heap.
   */
  const attributeRealm = async (cdp, label) => {
    const file = path.join(snapshotDir, `${label.replace(/[^\w.-]/g, '_')}.heapsnapshot`);
    // Appended as chunks arrive: joining them first builds the whole snapshot as one
    // string, which throws past V8's string cap at exactly the sizes this handles.
    const handle = openSync(file, 'w');
    let written = 0;
    cdp.on('HeapProfiler.addHeapSnapshotChunk', ({ chunk }) => {
      writeSync(handle, chunk);
      written += chunk.length;
    });
    await cdp.trySend('HeapProfiler.enable');
    const taken = await cdp
      .send(
        'HeapProfiler.takeHeapSnapshot',
        { captureNumericValue: false, reportProgress: false, treatGlobalObjectsAsRoots: true },
        undefined,
        300_000,
      )
      .catch(() => undefined);
    closeSync(handle);
    if (taken === undefined || written === 0) {
      rmSync(file, { force: true });
      return null;
    }
    try {
      const output = execFileSync(
        process.execPath,
        [
          '--max-old-space-size=8192',
          path.join(import.meta.dirname, 'heap-attribution.mjs'),
          file,
          ...(byCode ? ['--dist', distDir] : []),
        ],
        { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
      );
      return JSON.parse(output);
    } catch (error) {
      return { error: String(error.message ?? error).slice(0, 200) };
    } finally {
      rmSync(file, { force: true });
    }
  };

  const readRealms = async (label, { withSnapshots = false } = {}) => {
    const realms = [];
    for (const target of await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`)).json()) {
      if (
        !target.webSocketDebuggerUrl ||
        !['page', 'service_worker', 'shared_worker', 'worker'].includes(target.type)
      ) {
        continue;
      }
      const cdp = await Cdp.connect(target.webSocketDebuggerUrl).catch(() => undefined);
      if (!cdp) {
        continue;
      }
      // Three passes, because one collection leaves `FinalizationRegistry` callbacks
      // pending and a reading taken straight after still counts collected objects.
      for (let pass = 0; pass < 3; pass++) {
        await cdp.trySend('HeapProfiler.collectGarbage');
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      const samples = byCode ? await cdp.trySend('HeapProfiler.getSamplingProfile') : undefined;
      const heap = await cdp.trySend('Runtime.getHeapUsage');
      const wasm = await cdp.trySend('Runtime.evaluate', {
        expression: 'JSON.stringify(globalThis.__wasmProbe ? globalThis.__wasmProbe() : null)',
        returnByValue: true,
      });
      // Difference between V8's own two totals, which is the realm's ArrayBuffer
      // backing stores. `performance.memory` is exposed on Window only, so every
      // worker reports zero here and the wasm probe is what covers them.
      const external = await cdp.trySend('Runtime.evaluate', {
        expression: 'performance.memory ? performance.memory.usedJSHeapSize : 0',
        returnByValue: true,
      });
      const heapBytes = heap?.usedSize ?? 0;
      const name = (target.url.split('/').pop() || target.url).slice(0, 44);
      realms.push({
        // Carried so the snapshot pass below can match by identity: `/json/list` is enumerated
        // again there, and target churn between the two calls changes its order and length.
        targetId: target.id,
        type: target.type,
        name,
        url: target.url,
        heapBytes,
        externalBytes: Math.max(0, (external?.result?.value ?? 0) - heapBytes),
        wasm: JSON.parse(wasm?.result?.value ?? 'null'),
        ...(samples?.profile ? { code: attributeSamples(samples.profile, resolvePackage) } : {}),
        ...(withSnapshots ? { attribution: await attributeRealm(cdp, `${label}-${target.type}-${name}`) } : {}),
      });
      cdp.close();
    }
    return realms;
  };

  /** Shared memories are visible in every realm they reach, so they count once. */
  const sumWasm = (realms) => {
    const shared = new Map();
    let total = 0;
    for (const realm of realms) {
      for (const [key, bytes] of Object.entries(realm.wasm ?? {})) {
        if (key.startsWith('shared:')) {
          shared.set(key, Math.max(shared.get(key) ?? 0, bytes));
        } else {
          total += bytes;
        }
      }
    }
    return total + [...shared.values()].reduce((sum, bytes) => sum + bytes, 0);
  };

  /**
   * Allocator nodes whose pages the footprint charges to another process.
   *
   * A renderer's `gpu`, `cc` and `shared_memory` nodes describe regions shared with
   * the GPU process, which owns them: counted in this process's total they push the
   * allocator sum past a footprint that never included them.
   */
  const SHARED_BACKED = ['cc', 'gpu', 'ioaccelerator', 'iosurface', 'shared_memory'];

  const SIZE_UNITS = { G: 1024 ** 3, K: 1024, M: 1024 ** 2 };
  const parseSize = (text) => parseFloat(text) * (SIZE_UNITS[text.slice(-1)] ?? 1);

  /**
   * Every VM region of one process, grouped by kind.
   *
   * The closure instrument on macOS: memory-infra's `process_mmaps` provider is
   * Linux and Windows only, and no allocator node covers a mapping nobody claims.
   * Dirty plus swapped is what the physical footprint is made of, so these rows
   * add up to the footprint where the allocator tree does not.
   */
  const readRegions = (pid) => {
    let output;
    try {
      output = execFileSync('vmmap', ['--summary', String(pid)], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    } catch {
      return null;
    }
    const regions = {};
    for (const line of output.split('\n')) {
      const match = line.match(
        /^(\S.*?)\s+([\d.]+[KMG])\s+([\d.]+[KMG])\s+([\d.]+[KMG])\s+([\d.]+[KMG])\s+([\d.]+[KMG])\s+([\d.]+[KMG])\s+([\d.]+[KMG])\s+(\d+)/,
      );
      if (!match || match[1].startsWith('REGION')) {
        continue;
      }
      const dirty = parseSize(match[4]) + parseSize(match[5]);
      if (dirty > 0) {
        regions[match[1].trim()] = (regions[match[1].trim()] ?? 0) + dirty;
      }
    }
    const footprint = output.match(/Physical footprint:\s+([\d.]+[KMG])/);
    return {
      regions: Object.fromEntries(Object.entries(regions).sort((a, b) => b[1] - a[1])),
      dirtyBytes: Object.values(regions).reduce((total, bytes) => total + bytes, 0),
      footprintBytes: footprint ? parseSize(footprint[1]) : 0,
    };
  };

  /**
   * Anonymous regions with their resident size, keyed by virtual size.
   *
   * A wasm memory is one `Memory Tag 255` region whose VSIZE is exactly its
   * `byteLength`, so matching the probe's sizes against these gives the RESIDENT
   * share — `byteLength` alone is what was committed, and untouched pages of a
   * grown memory never reach the footprint.
   */
  const readAnonRegions = (pid) => {
    let output;
    try {
      output = execFileSync('vmmap', [String(pid)], {
        encoding: 'utf8',
        maxBuffer: 256 * 1024 * 1024,
        stdio: ['ignore', 'pipe', 'ignore'],
      });
    } catch {
      return [];
    }
    const regions = [];
    for (const line of output.split('\n')) {
      const match = line.match(
        /^(Memory Tag \d+)\s+[0-9a-f]+-[0-9a-f]+\s+\[\s*([\d.]+[KMG])\s+([\d.]+[KMG])\s+([\d.]+[KMG])/,
      );
      if (match) {
        regions.push({ tag: match[1], virtualBytes: parseSize(match[2]), dirtyBytes: parseSize(match[4]) });
      }
    }
    return regions;
  };

  /** Resident share of the memories the probe named, matched region by region. */
  const residentWasm = (regions, sizes) => {
    const pool = [...regions];
    let resident = 0;
    let matched = 0;
    // A memory that has grown sits in a reservation larger than its `byteLength`,
    // so the region is matched by range rather than equality, smallest fit first.
    pool.sort((a, b) => a.virtualBytes - b.virtualBytes);
    for (const size of [...sizes].sort((a, b) => b - a)) {
      const index = pool.findIndex(
        (region) => region.virtualBytes >= size - 128 * 1024 && region.virtualBytes <= size * 1.5 + 8 * 1024 * 1024,
      );
      if (index >= 0) {
        resident += pool[index].dirtyBytes;
        matched += 1;
        pool.splice(index, 1);
      }
    }
    return { resident, matched, requested: sizes.length };
  };

  const writeVmDetail = (pid) => {
    try {
      const output = execFileSync('vmmap', [String(pid)], {
        encoding: 'utf8',
        maxBuffer: 256 * 1024 * 1024,
        stdio: ['ignore', 'pipe', 'ignore'],
      });
      // Per pid, because a run has more than one app renderer and one file would
      // hold whichever was written last — reliably the smallest, not the subject.
      const file = vmOut.replace(/(\.[^.]+)?$/, `-${pid}$1`);
      writeFileSync(file, output);
      return file;
    } catch {
      return null;
    }
  };

  /**
   * What the document is made of, which is what Blink's allocators hold.
   *
   * PartitionAlloc and Oilpan carry the DOM, the CSSOM and the resources behind
   * them, and memory-infra reports that as one `<unspecified>` number. These
   * counts are the nameable drivers of it.
   */
  const CENSUS = `(() => {
  const count = (sheets) => {
    let rules = 0;
    for (const sheet of sheets) {
      try { rules += sheet.cssRules.length; } catch { /* cross-origin sheet */ }
    }
    return rules;
  };
  // Elements grouped by the nearest testid namespace, which plugins own: the DOM
  // is what Oilpan and the compositor hold, and a raw element count names nobody.
  const byOwner = {};
  for (const element of document.getElementsByTagName('*')) {
    let owner = '(unowned)';
    for (let node = element; node; node = node.parentElement) {
      const testId = node.getAttribute && node.getAttribute('data-testid');
      if (testId) {
        owner = testId.split('.').slice(0, 2).join('.');
        break;
      }
    }
    byOwner[owner] = (byOwner[owner] ?? 0) + 1;
  }
  const resources = performance.getEntriesByType('resource');
  const byType = {};
  for (const entry of resources) {
    byType[entry.initiatorType] = (byType[entry.initiatorType] ?? 0) + (entry.decodedBodySize || 0);
  }
  return JSON.stringify({
    cssRules: count(document.styleSheets),
    elements: document.getElementsByTagName('*').length,
    elementsByOwner: Object.fromEntries(Object.entries(byOwner).sort((a, b) => b[1] - a[1]).slice(0, 20)),
    fonts: document.fonts ? document.fonts.size : 0,
    marks: performance.getEntriesByType('mark').length,
    measures: performance.getEntriesByType('measure').length,
    resourceBytesByType: byType,
    resources: resources.length,
    styleSheets: document.styleSheets.length,
    svgUse: document.getElementsByTagName('use').length,
  });
})()`;

  /** One complete reading, named for the point in the journey it describes. */
  const checkpoint = async (label) => {
    // Snapshots come after the dump, in a second pass: taking one allocates
    // hundreds of megabytes in the realm it profiles, which would land in the
    // footprint this checkpoint reports.
    const realms = await readRealms(label);
    const currentUrl = await driver.url();
    const pageTarget = (await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`)).json()).find(
      (target) => target.type === 'page' && target.url === currentUrl,
    );
    const { byPid, kindByPid, frames } = await takeDump(
      pageTarget?.webSocketDebuggerUrl ?? version.webSocketDebuggerUrl,
    );
    const ourPids = new Set(frames.map((frame) => frame.processId));

    const rows = [];
    for (const [pid, { allocators, attrs, graph, totals }] of Object.entries(byPid)) {
      // `private_footprint_bytes`, hex, despite `private_footprint_kb` being the name
      // the mojom and the memory-infra docs use.
      const footprint = parseInt(totals?.private_footprint_bytes ?? '0', 16);
      if (!footprint) {
        continue;
      }
      const top = Object.entries(allocators).filter(([name]) => !name.includes('/'));
      // Whole subtree on the row: the printed ledger shows one level, but naming
      // what a 300 MB allocator holds takes two or three.
      const nested = Object.entries(allocators).filter(([name]) => name.includes('/'));
      const attributed = top.reduce((total, [, bytes]) => total + bytes, 0);

      // Nodes that own memory declared elsewhere restate it rather than add to it:
      // every `blink_objects` node carries an ownership edge into `blink_gc`, so the
      // whole subtree is a named view of Oilpan and counting it inflates the sum.
      const nameByGuid = new Map();
      for (const [nodeName, attr] of Object.entries(attrs)) {
        if (attr.guid) {
          nameByGuid.set(attr.guid, nodeName);
        }
      }
      const viewBytes = {};
      for (const edge of graph ?? []) {
        if (edge.type !== 'ownership') {
          continue;
        }
        const source = nameByGuid.get(edge.source);
        const target = nameByGuid.get(edge.target);
        if (!source || !target || !allocators[source]) {
          continue;
        }
        const root = source.split('/')[0];
        // Only across trees. An edge inside one allocator's own subtree is how that
        // provider relates its two views, and `effective_size` already resolves it;
        // subtracting those as well strips the allocator down to nothing.
        // Skipped when the target is already zero: the graph processor resolved the
        // edge on that side, and subtracting here would remove the memory twice.
        if (root !== target.split('/')[0] && (allocators[target] ?? 0) > 0) {
          viewBytes[root] = (viewBytes[root] ?? 0) + allocators[source];
        }
      }
      const private_ = top
        .filter(([name]) => !SHARED_BACKED.includes(name))
        .reduce((total, [name, bytes]) => total + Math.max(0, bytes - (viewBytes[name] ?? 0)), 0);
      const kind =
        kindByPid[Number(pid)] ?? (allocators.blink_gc || allocators.partition_alloc ? 'renderer' : 'unknown');
      // A renderer hosting one of our frames, plus the utilities that exist to serve
      // it: `storage` holds the OPFS and SQLite backing of this profile's data, which
      // is the app's memory wherever the kernel happens to charge it.
      const ours = ourPids.has(Number(pid)) || /network|storage/.test(kind);
      rows.push({
        pid: Number(pid),
        kind,
        ours,
        footprintBytes: footprint,
        attributedBytes: attributed,
        privateBytes: private_,
        sharedBackedBytes: top
          .filter(([name]) => SHARED_BACKED.includes(name))
          .reduce((total, [, bytes]) => total + bytes, 0),
        viewDeductedBytes: Object.entries(viewBytes)
          .filter(([name]) => !SHARED_BACKED.includes(name))
          .reduce((total, [name, bytes]) => total + Math.min(bytes, allocators[name] ?? 0), 0),
        // The quantity the ledger exists to produce: what no allocator claims.
        // Wasm linear memory lands here, having no dump provider at all.
        unattributedBytes: footprint - private_,
        allocators: Object.fromEntries(top.sort((a, b) => b[1] - a[1])),
        children: Object.fromEntries(nested.sort((a, b) => b[1] - a[1])),
        viewBytes,
        sizeOnly: Object.keys(attrs).filter((name) => !name.includes('/') && !attrs[name].effective),
        ...(ours || kind === 'gpu' ? { vm: readRegions(Number(pid)) } : {}),
        ...(ours && kind === 'renderer' ? { anon: readAnonRegions(Number(pid)) } : {}),
        ...(vmOut && ours && kind === 'renderer' ? { vmDetailFile: writeVmDetail(Number(pid)) } : {}),
      });
    }
    rows.sort((a, b) => b.footprintBytes - a.footprintBytes);

    const census = await driver
      .evaluate(CENSUS)
      .then((value) => JSON.parse(value))
      .catch(() => null);

    // A document realm joins to its pid through the frame list; a worker has no
    // frame and lives in its creator's process, so it falls to the largest.
    const pidByUrl = new Map(frames.map((frame) => [frame.url, frame.processId]));
    const host = rows
      .filter((row) => row.ours && row.kind === 'renderer')
      .sort((a, b) => b.footprintBytes - a.footprintBytes)[0];
    const wasmByPid = new Map();
    const sizesByPid = new Map();
    for (const realm of realms) {
      const pid = (['iframe', 'page'].includes(realm.type) ? pidByUrl.get(realm.url) : undefined) ?? host?.pid;
      wasmByPid.set(pid, (wasmByPid.get(pid) ?? 0) + sumWasm([realm]));
      sizesByPid.set(pid, [...(sizesByPid.get(pid) ?? []), ...Object.values(realm.wasm ?? {})]);
    }
    for (const row of rows) {
      if (row.ours && row.kind === 'renderer') {
        const committedWasm = wasmByPid.get(row.pid) ?? 0;
        // The region match is a diagnostic, not the closing term: its DIRTY column
        // comes in under what these memories demonstrably carry, and the committed
        // total is what the residual tracks across every run.
        const { matched, requested, resident } = residentWasm(row.anon ?? [], sizesByPid.get(row.pid) ?? []);
        row.wasmBytes = committedWasm;
        row.wasmResidentBytes = resident;
        row.wasmMatched = `${matched}/${requested}`;
        row.residualBytes = row.footprintBytes - row.privateBytes - committedWasm;
      }
      delete row.anon;
    }

    if (snapshots && label === snapshotAt) {
      const attributed = await readRealms(label, { withSnapshots: true });
      // Keyed by target id rather than zipped by index: the second enumeration can return a
      // different set, which assigned one realm's attribution to another. `${type} ${url}` is no
      // better a key — two dedicated workers running the same bundle share it.
      const byTargetId = new Map(attributed.map((realm) => [realm.targetId, realm]));
      for (const realm of realms) {
        realm.attribution = byTargetId.get(realm.targetId)?.attribution ?? null;
      }
    }

    const reading = {
      label,
      census,
      realms,
      rows,
      appFootprintBytes: rows.filter((row) => row.ours).reduce((total, row) => total + row.footprintBytes, 0),
      appUnattributedBytes: rows.filter((row) => row.ours).reduce((total, row) => total + row.unattributedBytes, 0),
      gpuFootprintBytes: rows.filter((row) => row.kind === 'gpu').reduce((total, row) => total + row.footprintBytes, 0),
      browserFootprintBytes: rows.reduce((total, row) => total + row.footprintBytes, 0),
      heapBytes: realms.reduce((total, realm) => total + realm.heapBytes, 0),
      externalBytes: realms.reduce((total, realm) => total + realm.externalBytes, 0),
      wasmResidentBytes: rows.reduce((total, row) => total + (row.wasmResidentBytes ?? 0), 0),
      residualBytes: rows.reduce((total, row) => total + (row.residualBytes ?? 0), 0),
      wasmBytes: sumWasm(realms),
    };
    readings.push(reading);
    console.log(
      `  [${label}] app ${String(MB(reading.appFootprintBytes)).padStart(7)}MB  heap ${String(MB(reading.heapBytes)).padStart(6)}MB` +
        `  wasm ${String(MB(reading.wasmBytes)).padStart(6)}MB` +
        `  residual ${String(MB(reading.residualBytes)).padStart(6)}MB  gpu ${MB(reading.gpuFootprintBytes)}MB`,
    );
    return reading;
  };

  const readings = [];
  console.log('\n=== checkpoints ===');
  await checkpoint('boot');

  if (work) {
    // The nightly's own fixture, so a number here and a row in the trend describe
    // the same journey over the same data.
    // Imported here rather than at the top: the fixture is TypeScript, so a static
    // import makes every run pay type stripping for a module only `--work` uses.
    const { SCALE, createProjectsFixture } = await import('../../src/playwright/perf/fixture.ts');
    const fixture = await createProjectsFixture(page, SCALE, `ledger-${Date.now()}`);
    console.log(`  fixture: ${fixture.taskCount} tasks, ${fixture.documentCount} documents`);
    await checkpoint('fixture-built');

    const invoke = (key, input) =>
      page.evaluate(({ key, input }) => globalThis.composer.invoke(key, input), { key, input });
    const editor = page.getByTestId('composer.markdownRoot').getByRole('textbox');

    await invoke('org.dxos.operation.appToolkit.switchWorkspace', { subject: `root/${fixture.spaceId}` });
    await page.waitForURL(new RegExp(`/w/${fixture.spaceId}`), { timeout: 120_000 });
    await checkpoint('open-space');

    await invoke('org.dxos.operation.appToolkit.open', {
      subject: [getProjectPath(fixture.spaceId, fixture.projectIds[0])],
    });
    await page.getByTestId('projectsPlugin.tab.tasks').click({ timeout: 120_000 });
    await page.getByTestId('taskList.item').first().waitFor({ timeout: 120_000 });
    await checkpoint('open-tasks');

    for (let step = 0; step < 10; step++) {
      await page.mouse.wheel(0, 2_000);
      await page.waitForTimeout(100);
    }
    await page.mouse.wheel(0, -20_000);
    await checkpoint('scroll-tasks');

    await invoke('org.dxos.operation.appToolkit.open', {
      subject: [GraphPath.getCollectionsPath(fixture.spaceId, fixture.documentIds[0])],
    });
    await editor.waitFor({ timeout: 120_000 });
    await editor.click({ timeout: 120_000 });
    await page.keyboard.type('Ledger probe edit. ', { delay: 20 });
    await checkpoint('edit-document');
  }

  const last = readings[readings.length - 1];
  console.log('\n=== processes at last checkpoint ===');
  for (const row of last.rows) {
    console.log(
      `  pid ${String(row.pid).padEnd(7)} ${(row.ours ? `app/${row.kind}` : row.kind).padEnd(16)} footprint ${String(MB(row.footprintBytes)).padStart(7)}MB` +
        `  private ${String(MB(row.privateBytes)).padStart(7)}MB  shared-backed ${String(MB(row.sharedBackedBytes)).padStart(6)}MB` +
        `  unattributed ${String(MB(row.unattributedBytes)).padStart(6)}MB`,
    );
    if (!row.ours && row.kind !== 'gpu') {
      continue;
    }
    for (const [name, bytes] of Object.entries(row.allocators)) {
      console.log(`      ${name.padEnd(22)} ${String(MB(bytes)).padStart(8)}MB`);
      for (const [child, childBytes] of Object.entries(row.children)) {
        if (child.startsWith(`${name}/`) && child.split('/').length === 2 && childBytes > 2 * 1048576) {
          console.log(`        ${child.padEnd(24)} ${String(MB(childBytes)).padStart(6)}MB`);
        }
      }
    }
    if (row.residualBytes != null) {
      console.log(
        `      ${'(private nodes)'.padEnd(22)} ${String(MB(row.privateBytes)).padStart(8)}MB` +
          ` + wasm ${MB(row.wasmBytes ?? 0)}MB + residual ${MB(row.residualBytes)}MB` +
          ` = footprint ${MB(row.footprintBytes)}MB` +
          `  (${(100 * Math.abs(row.residualBytes / row.footprintBytes)).toFixed(1)}% unattributed)`,
      );
    }
  }

  if (byCode) {
    const totals = new Map();
    for (const realm of last.realms) {
      for (const { bytes, name } of realm.code?.byPackage ?? []) {
        totals.set(name, (totals.get(name) ?? 0) + bytes);
      }
    }
    console.log('\n=== JS allocation by package (sampled) ===');
    for (const [name, bytes] of [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30)) {
      console.log(`  ${String(MB(bytes)).padStart(8)}MB  ${name}`);
    }
    const unresolved = last.realms.reduce((total, realm) => total + (realm.code?.unresolvedBytes ?? 0), 0);
    console.log(`  ${String(MB(unresolved)).padStart(8)}MB  (unresolved)`);
  }

  console.log('\n=== realms at last checkpoint ===');
  for (const realm of last.realms) {
    const wasm = Object.entries(realm.wasm ?? {});
    console.log(
      `  ${realm.type.padEnd(14)} ${realm.name.padEnd(46)} heap ${String(MB(realm.heapBytes)).padStart(7)}MB` +
        `  external ${String(MB(realm.externalBytes)).padStart(7)}MB` +
        (wasm.length ? `  wasm ${wasm.map(([module, bytes]) => `${module}=${MB(bytes)}MB`).join(' ')}` : ''),
    );
  }

  if (baselineFile) {
    const baseline = JSON.parse(readFileSync(baselineFile, 'utf8'));
    const rendererOf = (reading) =>
      reading.rows
        .filter((row) => row.ours && row.kind === 'renderer')
        .sort((a, b) => b.footprintBytes - a.footprintBytes)[0];
    const before = rendererOf(baseline.readings[baseline.readings.length - 1]);
    const after = rendererOf(last);
    if (before && after) {
      console.log(`\n=== added over ${baselineFile} ===`);
      const line = (name, from, to) =>
        console.log(
          `  ${name.padEnd(46)} ${String(MB(from)).padStart(8)} -> ${String(MB(to)).padStart(8)}  (+${MB(to - from)}MB)`,
        );
      line('footprint', before.footprintBytes, after.footprintBytes);
      for (const name of new Set([...Object.keys(before.allocators), ...Object.keys(after.allocators)])) {
        const from = before.allocators[name] ?? 0;
        const to = after.allocators[name] ?? 0;
        if (Math.abs(to - from) > 1048576) {
          line(name, from, to);
        }
      }
      const key = 'partition_alloc/allocated_objects/<unspecified>';
      line(key, before.children?.[key] ?? 0, after.children?.[key] ?? 0);
    }
  }

  if (jsonOut) {
    writeFileSync(jsonOut, JSON.stringify({ url, settleS, work, readings }, null, 2));
    console.log(`\nwrote ${jsonOut}`);
  }
} finally {
  await shutdown();
}
