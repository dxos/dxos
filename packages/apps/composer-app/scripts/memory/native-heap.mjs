//
// Copyright 2026 DXOS.org
//

/**
 * Names the C++ call sites behind a renderer's `malloc` and `partition_alloc` memory.
 *
 * `ledger.mjs` can say how many bytes sit under each allocator node but not what asked
 * for them: `partition_alloc/allocated_objects/<unspecified>` is most of a Composer tab's
 * PartitionAlloc and no memory-infra dump provider claims it. Chromium's native sampling
 * heap profiler does have the stacks — the obstacle is that Chrome for Testing and the
 * Chromium snapshot builds are both shipped stripped, so the frames come back as bare
 * addresses.
 *
 * Electron is the way around that: it embeds the same Chromium and publishes a breakpad
 * symbol file per release, so the same profile resolves to real function names. Run
 * `fetch-electron.sh` once to download both. macOS only.
 *
 * The profile is one process wide and does not separate `malloc` from PartitionAlloc, so
 * read it as a decomposition of the two together.
 *
 * Usage: node native-heap.mjs <url> [--settle 90] [--rate 10000] [--json out.json]
 *        [--electron <Electron.app>] [--symbols <Electron Framework.sym>]
 *        [--profile <dir>] [--journey]
 *
 * `--profile` reuses a persistent profile instead of a throwaway one, and `--journey`
 * then opens the objects `seed-profile.mjs` recorded in it. An empty tab is not the
 * state anyone complains about.
 */

import { spawn } from 'node:child_process';
import {
  closeSync,
  createReadStream,
  existsSync,
  mkdtempSync,
  openSync,
  readFileSync,
  readSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createInterface } from 'node:readline';

import * as GraphPath from '@dxos/app-toolkit/GraphPath';

import { WASM_PROBE } from './probes.mjs';

/** Restated rather than imported: `plugin-projects` does not export its `paths` module. */
const getProjectPath = (spaceId, projectId) =>
  GraphPath.getSpacePath(spaceId, GraphPath.GroupSegments.ai, 'org.dxos.type.project', projectId);

// Installed alongside the native profiler so a run that catches a spike can say which JS
// call produced it: the native stack names the C++ frame, and below that it is all JIT
// addresses. Kept in step with `api-census.mjs`, which is the same shim on its own.
const IDB_PROBE = `(() => {
  if (globalThis.__idbProbe) { return; }
  const calls = {};
  globalThis.__idbProbe = calls;
  for (const proto of [IDBObjectStore.prototype, IDBIndex.prototype]) {
    for (const name of ['getAll', 'getAllKeys', 'getAllRecords', 'openCursor', 'openKeyCursor', 'get', 'getKey', 'count']) {
      const original = proto[name];
      if (!original) { continue; }
      proto[name] = function (...args) {
        let store = '?';
        try { const owner = this.objectStore ?? this; store = owner.transaction.db.name + '/' + owner.name; } catch {}
        const frames = (new Error().stack || '').split('\\n').slice(3, 7).map((line) => line.trim()).join(' | ');
        const key = name + ' ' + store + ' @ ' + frames;
        calls[key] = (calls[key] ?? 0) + 1;
        return original.apply(this, args);
      };
    }
  }
})()`;

// The native stack under \`PerformanceMeasure::Create\` is the structured clone of \`detail\`
// and nothing JS-side, so the same trick names the caller and weighs what it passed.
const MEASURE_PROBE = `(() => {
  if (globalThis.__measureProbe || typeof performance?.measure !== 'function') { return; }
  const calls = {};
  globalThis.__measureProbe = calls;
  const original = performance.measure.bind(performance);
  performance.measure = function (name, ...rest) {
    const detail = rest[0] && typeof rest[0] === 'object' ? rest[0].detail : undefined;
    let bytes = 0;
    if (detail !== undefined) { try { bytes = JSON.stringify(detail).length; } catch { bytes = -1; } }
    const frames = (new Error().stack || '').split('\\n').slice(2, 6).map((line) => line.trim()).join(' | ');
    const key = String(name).slice(0, 40) + ' @ ' + frames;
    const entry = (calls[key] ??= { count: 0, detailBytes: 0 });
    entry.count += 1;
    entry.detailBytes += Math.max(bytes, 0);
    return original(name, ...rest);
  };
})()`;

const url = process.argv[2]?.startsWith('--') ? 'http://localhost:4173' : (process.argv[2] ?? 'http://localhost:4173');
const arg = (name, dflt) => {
  const i = process.argv.indexOf(name);
  if (i < 0) {
    return dflt;
  }
  const value = process.argv[i + 1];
  // Otherwise `--settle` with no value silently becomes NaN and the run does not settle.
  if (value === undefined || value.startsWith('--')) {
    console.error(`${name} needs a value`);
    process.exit(1);
  }
  return value;
};
const number = (name, dflt) => {
  const value = Number(arg(name, dflt));
  if (!Number.isFinite(value) || value < 0) {
    console.error(`${name} must be a non-negative number`);
    process.exit(1);
  }
  return value;
};
const settleS = number('--settle', '90');
// The mean bytes between samples. Large allocations are captured near-exactly at any
// setting; this only controls how well the long tail of small ones is estimated.
const rate = number('--rate', '10000');
if (rate === 0) {
  // A zero interval asks the Poisson sampler to record every allocation.
  console.error('--rate must be greater than zero');
  process.exit(1);
}
const jsonOut = arg('--json', null);
const electronRoot = arg('--electron', process.env.ELECTRON_APP ?? './tmp/electron/Electron.app');
const symFile = arg('--symbols', process.env.ELECTRON_SYMBOLS ?? null);
const port = parseInt(process.env.NATIVE_HEAP_PORT ?? '9402', 10);
const persistentProfile = arg('--profile', null);
const journey = process.argv.includes('--journey');
if (journey && !persistentProfile) {
  console.error("--journey needs --profile: the objects to open come from that profile's fixture.json");
  process.exit(1);
}
const MB = (bytes) => +(bytes / (1024 * 1024)).toFixed(2);
// A realm whose event loop is busy never answers `collectGarbage`, and a missed collection
// costs precision while a hung one costs the whole run.
const GC_TIMEOUT_MS = 15_000;

const electronBin = path.join(electronRoot, 'Contents/MacOS/Electron');
if (!existsSync(electronBin)) {
  console.error(`no Electron at ${electronBin} — run scripts/memory/fetch-electron.sh`);
  process.exit(1);
}
if (!symFile || !existsSync(symFile)) {
  console.error(`no symbol file at ${symFile ?? '<missing>'} — run scripts/memory/fetch-electron.sh`);
  process.exit(1);
}

/**
 * Address ranges from a breakpad .sym, sorted by module-relative address.
 *
 * `PUBLIC` as well as `FUNC`, because an address that only has a `PUBLIC` record would
 * otherwise come back unresolved and then read as a plausible-looking call site. The .sym
 * is ~700 MB of text and only these two record types matter, so the extract is cached
 * beside it.
 */
const loadSymbols = async (file, moduleLine) => {
  const cache = `${file}.ranges.tsv`;
  // Keyed on the .sym's own MODULE line, not just its path: a different Electron version
  // written to the same path would otherwise resolve through the old index and produce
  // plausible names for the wrong binary.
  const stamp = `# ${moduleLine}`;
  const stampMatches = () => {
    if (!existsSync(cache)) {
      return false;
    }
    const head = Buffer.alloc(Buffer.byteLength(stamp) + 1);
    const fd = openSync(cache, 'r');
    readSync(fd, head, 0, head.length, 0);
    closeSync(fd);
    return head.toString('utf8') === `${stamp}\n`;
  };
  if (!stampMatches()) {
    const rows = [];
    const lines = createInterface({ input: createReadStream(file, { highWaterMark: 1 << 22 }), crlfDelay: Infinity });
    for await (const line of lines) {
      // FUNC [m] <address> <size> <parameter_size> <name> / PUBLIC [m] <address> <parameter_size> <name>
      const func = line.startsWith('FUNC ');
      if (!func && !line.startsWith('PUBLIC ')) {
        continue;
      }
      const rest = line.slice(func ? 5 : 7).replace(/^m /, '');
      const fields = rest.split(' ');
      if (fields.length < (func ? 4 : 3)) {
        continue;
      }
      const start = parseInt(fields[0], 16);
      const size = func ? parseInt(fields[1], 16) : 0;
      const name = fields.slice(func ? 3 : 2).join(' ');
      if (Number.isFinite(start) && name) {
        rows.push([start, Number.isFinite(size) ? size : 0, name]);
      }
    }
    // Widest extent first at a shared start address, so the dedupe below keeps the record
    // that can actually contain an offset rather than a zero-size alias.
    rows.sort((x, y) => x[0] - y[0] || y[1] - x[1]);
    const written = `${cache}.${process.pid}.part`;
    writeFileSync(
      written,
      `${stamp}\n${rows.map((r) => `${r[0].toString(16)}\t${r[1].toString(16)}\t${r[2]}`).join('\n')}`,
    );
    // Renamed rather than written in place: an interrupted write would otherwise leave a
    // truncated cache that every later run reuses, silently resolving to the wrong names.
    renameSync(written, cache);
    console.error(`  indexed ${rows.length} symbols -> ${cache}`);
  }
  const starts = [];
  const sizes = [];
  const names = [];
  for (const line of readFileSync(cache, 'utf8').split('\n')) {
    const a = line.indexOf('\t');
    if (a < 0 || line.startsWith('#')) {
      continue;
    }
    const b = line.indexOf('\t', a + 1);
    const start = parseInt(line.slice(0, a), 16);
    if (starts.length && starts.at(-1) === start) {
      continue;
    }
    starts.push(start);
    sizes.push(parseInt(line.slice(a + 1, b), 16));
    names.push(line.slice(b + 1));
  }
  if (starts.length === 0) {
    throw new Error(`no symbols parsed from ${file}`);
  }
  return (offset) => {
    let lo = 0;
    let hi = starts.length - 1;
    let best = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (starts[mid] <= offset) {
        best = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    if (best < 0) {
      return null;
    }
    // A `FUNC` names only its own extent; past that the offset belongs to something else
    // and the preceding symbol would name the wrong caller. A `PUBLIC` has no extent, so
    // it is the nearest-preceding answer and is marked as approximate.
    if (sizes[best] > 0) {
      return offset < starts[best] + sizes[best] ? names[best] : null;
    }
    return `${names[best]}+0x${(offset - starts[best]).toString(16)}`;
  };
};

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
    // Otherwise a socket that dies mid-run leaves every outstanding call hanging until its
    // own timeout, which on a 240s settle is most of the run.
    cdp.#ws.addEventListener('close', () => {
      for (const { reject } of cdp.#pending.values()) {
        reject(new Error('CDP socket closed'));
      }
      cdp.#pending.clear();
    });
    return cdp;
  }

  send(method, params = {}, { sessionId, timeoutMs = 180_000 } = {}) {
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

  trySend(method, params, options) {
    return this.send(method, params, options).catch(() => undefined);
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

console.error('loading symbols ...');
// Read as a handful of bytes: the .sym itself is ~700 MB and only its first line is wanted.
const header = Buffer.alloc(256);
const symFd = openSync(symFile, 'r');
readSync(symFd, header, 0, header.length, 0);
closeSync(symFd);
const moduleLine = header.toString('utf8').split('\n')[0];
if (!moduleLine?.startsWith('MODULE ')) {
  console.error(`${symFile} is not a breakpad symbol file`);
  process.exit(1);
}
const lookup = await loadSymbols(symFile, moduleLine);

// A one-file Electron app: a hidden window that stays on about:blank until the profiler
// is armed, so the app's own allocation is inside the sample and the harness's is not.
const appDir = mkdtempSync(path.join(tmpdir(), 'native-heap-app-'));
writeFileSync(
  path.join(appDir, 'package.json'),
  JSON.stringify({ main: 'main.js', name: 'native-heap', version: '1.0.0' }),
);
writeFileSync(
  path.join(appDir, 'main.js'),
  `const { app, BrowserWindow } = require('electron');
if (process.env.PROBE_PROFILE) { app.setPath('userData', process.env.PROBE_PROFILE); }
app.commandLine.appendSwitch('remote-debugging-port', process.env.PROBE_PORT);
app.commandLine.appendSwitch('renderer-process-limit', '8');
app.commandLine.appendSwitch('enable-precise-memory-info');
app.whenReady().then(() => {
  new BrowserWindow({
    show: false,
    width: 1440,
    height: 900,
    webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true, backgroundThrottling: false },
  }).loadURL('about:blank');
});
app.on('window-all-closed', () => app.quit());
`,
);

const child = spawn(electronBin, [appDir], {
  stdio: ['ignore', 'pipe', 'pipe'],
  env: {
    ...process.env,
    PROBE_PORT: String(port),
    ...(persistentProfile ? { PROBE_PROFILE: path.resolve(persistentProfile) } : {}),
  },
});
let childLog = '';
child.stdout.on('data', (chunk) => (childLog += chunk));
child.stderr.on('data', (chunk) => (childLog += chunk));

let cleaned = false;
const shutdown = async () => {
  if (cleaned) {
    return;
  }
  cleaned = true;
  // SIGTERM first so the browser tears its helper processes down itself; SIGKILL on the
  // parent alone would orphan the renderer, which is the 300 MB one. Awaited, so the
  // escalation is not cut short by the process exiting.
  child.kill('SIGTERM');
  await Promise.race([
    new Promise((resolve) => child.once('exit', resolve)),
    new Promise((resolve) => setTimeout(resolve, 2000).unref?.()),
  ]);
  child.kill('SIGKILL');
  rmSync(appDir, { force: true, recursive: true });
};
// The persistent profile is an input, never removed: only the generated app dir is scratch.
// Without a listener a failed exec throws out of band, past the try/finally below.
child.on('error', (error) => {
  console.error(`could not run ${electronBin}: ${error.message}`);
  rmSync(appDir, { force: true, recursive: true });
  process.exit(1);
});
for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(signal, () => {
    void shutdown().then(() => process.exit(130));
  });
}

try {
  let version;
  for (let i = 0; i < 60 && !version; i++) {
    version = await fetch(`http://127.0.0.1:${port}/json/version`)
      .then((response) => response.json())
      .catch(() => undefined);
    if (!version) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  if (!version) {
    throw new Error(`Electron never opened a debugger port\n${childLog.slice(0, 2000)}`);
  }
  console.error(`${version.Browser} — ${url}`);

  let page;
  for (let i = 0; i < 40 && !page; i++) {
    const targets = await fetch(`http://127.0.0.1:${port}/json/list`)
      .then((response) => response.json())
      .catch(() => []);
    page = targets.find((target) => target.type === 'page');
    if (!page) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  if (!page) {
    throw new Error(`no page target\n${childLog.slice(0, 2000)}`);
  }

  const cdp = await Cdp.connect(page.webSocketDebuggerUrl);
  // Dedicated workers are not top-level targets and never appear in `/json/list`, so the
  // only way to reach the realms Composer does most of its work in is to auto-attach.
  const workerSessions = new Map();
  cdp.on('Target.attachedToTarget', ({ sessionId, targetInfo }) => {
    if (!['iframe', 'service_worker', 'shared_worker', 'worker'].includes(targetInfo.type)) {
      return;
    }
    workerSessions.set(sessionId, targetInfo.type);
    void cdp.trySend('Runtime.evaluate', { expression: IDB_PROBE, returnByValue: true }, { sessionId });
    void cdp.trySend('Runtime.evaluate', { expression: MEASURE_PROBE, returnByValue: true }, { sessionId });
    void cdp.trySend('Runtime.evaluate', { expression: WASM_PROBE, returnByValue: true }, { sessionId });
    // Re-armed on the new session, because auto-attach covers a session's own children
    // only. Composer's client worker creates the observability worker that runs the log
    // store, and without this that grandchild realm is never reached.
    void cdp.trySend(
      'Target.setAutoAttach',
      { autoAttach: true, flatten: true, waitForDebuggerOnStart: false },
      { sessionId },
    );
  });
  cdp.on('Target.detachedFromTarget', ({ sessionId }) => workerSessions.delete(sessionId));
  await cdp.send('Target.setAutoAttach', { autoAttach: true, flatten: true, waitForDebuggerOnStart: false });
  await cdp.send('Page.enable');
  await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: IDB_PROBE });
  await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: MEASURE_PROBE });
  // Linear memory appears in no allocator node, so this is the only instrument that
  // names the modules behind the residual — and the journey is when automerge grows.
  await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: WASM_PROBE });
  if (persistentProfile && !process.argv.includes('--keep-service-worker')) {
    // A seeded profile holds the service worker and precache of the build it was seeded
    // with, and a later build never runs until the app itself updates: three runs measured
    // the previous bundle that way. Drop those two stores only; the data stays in IndexedDB
    // and OPFS, which is what makes the profile a loaded one.
    await cdp.send('Storage.clearDataForOrigin', {
      origin: new URL(url).origin,
      storageTypes: 'service_workers,cache_storage',
    });
  }
  await cdp.send('Memory.startSampling', { samplingInterval: rate, suppressRandomness: false });
  await cdp.send('Page.navigate', { url });
  console.error(`navigated; settling ${settleS}s ...`);
  await new Promise((resolve) => setTimeout(resolve, settleS * 1000));

  if (journey) {
    const manifest = JSON.parse(readFileSync(path.join(path.resolve(persistentProfile), 'fixture.json'), 'utf8'));
    // Driven through the operation registry rather than the UI: a click needs Playwright,
    // and Playwright is the ~130 MB this script exists to keep out of the measurement.
    const invoke = async (key, input) => {
      const { exceptionDetails } = await cdp.send('Runtime.evaluate', {
        awaitPromise: true,
        expression: `globalThis.composer.invoke(${JSON.stringify(key)}, ${JSON.stringify(input)})`,
        returnByValue: true,
      });
      if (exceptionDetails) {
        throw new Error(`${key}: ${exceptionDetails.exception?.description ?? exceptionDetails.text}`);
      }
    };
    for (const fixture of manifest.fixtures) {
      console.error(`  opening ${fixture.spaceId} ...`);
      await invoke('org.dxos.operation.appToolkit.switchWorkspace', { subject: `root/${fixture.spaceId}` });
      await new Promise((resolve) => setTimeout(resolve, 4000));
      await invoke('org.dxos.operation.appToolkit.open', {
        subject: [getProjectPath(fixture.spaceId, fixture.projectIds[0])],
      });
      await new Promise((resolve) => setTimeout(resolve, 6000));
      await invoke('org.dxos.operation.appToolkit.open', {
        subject: [GraphPath.getCollectionsPath(fixture.spaceId, fixture.documentIds[0])],
      });
      await new Promise((resolve) => setTimeout(resolve, 8000));
    }
    console.error(`  opened ${manifest.fixtures.length} spaces; settling 30s ...`);
    await new Promise((resolve) => setTimeout(resolve, 30_000));
  }

  // The sampler drops a sample when its allocation is freed, so a collection first is what
  // makes the result retention rather than churn. Each realm has its own isolate.
  await cdp.trySend('HeapProfiler.enable', {}, { timeoutMs: GC_TIMEOUT_MS });
  const pageCollected = await cdp.trySend('HeapProfiler.collectGarbage', {}, { timeoutMs: GC_TIMEOUT_MS });
  let collected = pageCollected ? 1 : 0;
  for (const sessionId of workerSessions.keys()) {
    await cdp.trySend('HeapProfiler.enable', {}, { sessionId, timeoutMs: GC_TIMEOUT_MS });
    const result = await cdp.trySend('HeapProfiler.collectGarbage', {}, { sessionId, timeoutMs: GC_TIMEOUT_MS });
    if (result) {
      collected++;
    }
  }
  // Named, because a realm missing from this list is one whose garbage the profile will
  // report as live — the difference between "retained" and "allocated faster than GC".
  console.error(
    `  collected ${collected} of ${workerSessions.size + 1} attached realms: page, ${[...workerSessions.values()].join(', ')}` +
      ' (service and shared workers live in other processes and do not affect this one)',
  );
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // Read before the dump, so a spike in the IndexedDB category can be matched to the JS
  // that issued the reads in the same run.
  const idbCalls = new Map();
  const measureCalls = new Map();
  const wasmByModule = new Map();
  for (const sessionId of [undefined, ...workerSessions.keys()]) {
    // Which realm holds a memory is the question the module name alone cannot answer: the
    // same automerge binary is instantiated in the tab and in the worker, and the split
    // between them is what says whether the tab's replica or the worker's corpus is bigger.
    const realm = sessionId ? (workerSessions.get(sessionId) ?? 'worker') : 'page';
    const result = await cdp.trySend(
      'Runtime.evaluate',
      { expression: 'JSON.stringify(globalThis.__idbProbe ?? {})', returnByValue: true },
      { sessionId, timeoutMs: GC_TIMEOUT_MS },
    );
    for (const [key, count] of Object.entries(JSON.parse(result?.result?.value ?? '{}'))) {
      idbCalls.set(key, (idbCalls.get(key) ?? 0) + count);
    }
    const measures = await cdp.trySend(
      'Runtime.evaluate',
      { expression: 'JSON.stringify(globalThis.__measureProbe ?? {})', returnByValue: true },
      { sessionId, timeoutMs: GC_TIMEOUT_MS },
    );
    for (const [key, entry] of Object.entries(JSON.parse(measures?.result?.value ?? '{}'))) {
      // Accumulated, not replaced: `realm` is the target KIND, so two dedicated workers running
      // the same bundle produce the same tagged key and the second one overwrote the first.
      const tagged = `${realm} ${key}`;
      const previous = measureCalls.get(tagged) ?? { count: 0, detailBytes: 0 };
      measureCalls.set(tagged, {
        count: previous.count + entry.count,
        detailBytes: previous.detailBytes + entry.detailBytes,
      });
    }
    const wasm = await cdp.trySend(
      'Runtime.evaluate',
      { expression: 'JSON.stringify(globalThis.__wasmProbe?.() ?? {})', returnByValue: true },
      { sessionId, timeoutMs: GC_TIMEOUT_MS },
    );
    for (const [key, bytes] of Object.entries(JSON.parse(wasm?.result?.value ?? '{}'))) {
      // A `shared:` memory is visible in every realm it was posted to, so summing across
      // realms would count one allocation once per realm; the probe tags it and the last
      // reading wins rather than accumulating.
      const tagged = `${realm}  ${key}`;
      if (key.startsWith('shared:')) {
        wasmByModule.set(tagged, bytes);
      } else {
        wasmByModule.set(tagged, (wasmByModule.get(tagged) ?? 0) + bytes);
      }
    }
  }

  const { profile } = await cdp.send('Memory.getSamplingProfile');
  if (!profile?.samples?.length) {
    throw new Error('the sampling profile is empty — the renderer was probably swapped on navigation');
  }

  // The allocator ledger for the same renderer, so the sample can be read as a share of it.
  const events = [];
  cdp.on('Tracing.dataCollected', ({ value }) => {
    for (const event of value) {
      events.push(event);
    }
  });
  const complete = new Promise((resolve) => cdp.on('Tracing.tracingComplete', resolve));
  await cdp.send('Tracing.start', {
    traceConfig: { excludedCategories: ['*'], includedCategories: ['disabled-by-default-memory-infra'] },
    transferMode: 'ReportEvents',
  });
  await cdp.send('Tracing.requestMemoryDump', { deterministic: true, levelOfDetail: 'detailed' });
  await new Promise((resolve) => setTimeout(resolve, 5000));
  await cdp.send('Tracing.end');
  await Promise.race([complete, new Promise((resolve) => setTimeout(resolve, 120_000).unref?.())]);

  const modules = profile.modules.map((module) => ({
    base: Number(BigInt(module.baseAddress)),
    end: Number(BigInt(module.baseAddress)) + Number(module.size),
    name: module.name.replace(/^.*\//, ''),
  }));
  const framework = modules.find((module) => /Electron Framework/.test(module.name));
  if (!framework) {
    throw new Error(`the profile carries no Electron Framework module: ${modules.map((m) => m.name).join(', ')}`);
  }
  // Recorded as they are produced rather than recognised by shape afterwards: a
  // PUBLIC-resolved `name+0x…` is still a name, and a C++ symbol may contain a `+`.
  const unresolvedFrames = new Set();
  const symbolize = (address) => {
    let value;
    try {
      value = Number(BigInt(address));
    } catch {
      unresolvedFrames.add(String(address));
      return String(address);
    }
    if (value >= framework.base && value < framework.end) {
      const name = lookup(value - framework.base);
      if (name) {
        return name;
      }
      const frame = `Electron Framework+0x${(value - framework.base).toString(16)}`;
      unresolvedFrames.add(frame);
      return frame;
    }
    const module = modules.find((candidate) => value >= candidate.base && value < candidate.end);
    const frame = module ? `${module.name}+0x${(value - module.base).toString(16)}` : `0x${value.toString(16)}`;
    unresolvedFrames.add(frame);
    return frame;
  };

  // The allocator shim and the sampler itself sit on top of every stack and name nothing.
  const PLUMBING = [
    /SamplingHeapProfiler|PoissonAllocationSampler|allocator_shim|DispatcherImpl|AllocFn|ReallocFn|Shim(M?alloc|Calloc|Realloc|CppNew|CppAlignedNew)/,
    /partition_alloc::|PartitionAllocFunctionsInternal|PartitionRoot|PartitionAllocator::|AllocateBacking|ReallocateBacking/,
    /^operator new|^(m|c|re)alloc$|libsystem_malloc/,
    /^WTF::Partitions::|^blink::Partitions::|::fastMalloc|::fastRealloc/,
    /^std::__Cr::(allocator|__libcpp_allocate|__allocate)/,
    /base::internal::(Invoke|FunctorTraits|InvokeHelper)/,
  ];
  // Container and string internals are real frames, but "a vector grew" names no feature;
  // the caller one frame further down does. Anchored at the start of the symbol so a
  // container appearing only as a template parameter of a real call site does not match.
  const GENERIC =
    /^(blink::)?(StringImpl::(Create|Allocate)|StringBuffer|StringBuilder|CharacterBuffer|VectorBuffer)|^(blink::)?Vector<.*>::(expand|reserve|Grow|Reallocate|append)|^(blink::)?HashTable<.*>::(Rehash|expand)|^(blink::)?VectorBufferBase<|::(ReserveCapacity|AllocateBuffer|__add_back_capacity)\b|^std::__Cr::(vector|deque|basic_string|__hash_table|__tree)|^absl::container_internal|^blink::MakeGarbageCollected/;
  const isPlumbing = (frame) => !frame || PLUMBING.some((pattern) => pattern.test(frame));
  const pick = (stack, skipGeneric) => {
    for (const frame of stack) {
      if (!isPlumbing(frame) && !(skipGeneric && GENERIC.test(frame))) {
        return frame;
      }
    }
    return stack.find((frame) => !isPlumbing(frame)) ?? '<allocator internals only>';
  };

  const samples = profile.samples.map((sample) => ({
    bytes: sample.total,
    size: sample.size,
    stack: sample.stack.map(symbolize),
  }));
  const sampled = samples.reduce((sum, sample) => sum + sample.bytes, 0);
  // An address with no symbol still reads as a call site once it is printed, so say how
  // much of the total is one.
  const unresolved = samples
    .filter((sample) => unresolvedFrames.has(pick(sample.stack, false)))
    .reduce((sum, sample) => sum + sample.bytes, 0);

  // Only a renderer has a PartitionAlloc tree, and the profile came from the renderer the
  // page is in — which is not the browser's largest process, and not necessarily the first
  // renderer in the trace either, since Composer runs more than one.
  const perPid = new Map();
  for (const event of events) {
    const dumps = event.args?.dumps;
    if (event.ph !== 'v' || !dumps) {
      continue;
    }
    const entry = perPid.get(event.pid) ?? { allocators: {}, footprint: 0 };
    const raw = dumps.process_totals?.private_footprint_bytes;
    if (raw) {
      entry.footprint = Math.max(entry.footprint, parseInt(raw, 16));
    }
    for (const [name, node] of Object.entries(dumps.allocators ?? {})) {
      const size = node.attrs?.size ?? node.attrs?.effective_size;
      if (size) {
        entry.allocators[name] = parseInt(size.value, 16);
      }
    }
    perPid.set(event.pid, entry);
  }
  // A Blink heap as well as a PartitionAlloc tree: under PartitionAlloc-Everywhere a
  // non-renderer can carry the latter, and only a renderer runs Oilpan.
  const liveOf = (entry) =>
    (entry.allocators['malloc/allocated_objects'] ?? 0) + (entry.allocators['partition_alloc/allocated_objects'] ?? 0);
  const renderers = [...perPid].filter(
    ([, entry]) => entry.allocators.partition_alloc != null && entry.allocators.blink_gc != null,
  );
  // Ranked by live objects rather than footprint, because the sample is a subset of them:
  // the process the profile came from has to be big enough to contain it.
  const [rendererPid, renderer] = renderers.sort((a, b) => liveOf(b[1]) - liveOf(a[1]))[0] ?? [null, null];
  if (!renderer) {
    throw new Error('the memory dump contains no renderer process');
  }
  if (renderers.length > 1) {
    console.error(
      `  ${renderers.length} renderers in the dump; reading pid ${rendererPid} (${MB(liveOf(renderer))} MB live), ` +
        `others ${renderers
          .filter(([pid]) => pid !== rendererPid)
          .map(([pid, entry]) => `${pid}@${MB(liveOf(entry))}MB`)
          .join(', ')}`,
    );
  }
  const totals = renderer.allocators;
  const footprint = renderer.footprint;

  const live = (totals['malloc/allocated_objects'] ?? 0) + (totals['partition_alloc/allocated_objects'] ?? 0);
  console.log(`\nrenderer pid ${rendererPid}, private footprint ${MB(footprint)} MB`);
  for (const name of [
    'malloc',
    'malloc/allocated_objects',
    'partition_alloc',
    'partition_alloc/allocated_objects',
    'partition_alloc/allocated_objects/<unspecified>',
    'v8',
    'blink_gc',
  ]) {
    if (totals[name] != null) {
      console.log(`  ${name.padEnd(48)} ${String(MB(totals[name])).padStart(9)} MB`);
    }
  }
  console.log(
    `  ${'sampled by the native heap profiler'.padEnd(48)} ${String(MB(sampled)).padStart(9)} MB` +
      (live ? ` (${((sampled / live) * 100).toFixed(0)}% of live allocated objects)` : ''),
  );
  console.log(
    `  ${'  of which no symbol could be resolved'.padEnd(48)} ${String(MB(unresolved)).padStart(9)} MB` +
      (sampled ? ` (${((unresolved / sampled) * 100).toFixed(1)}%)` : ''),
  );
  // The sample is a Poisson estimate, so a few percent over the live total is the
  // estimator; far over means the profile and the dump describe different processes.
  if (live && sampled > live * 1.15) {
    console.error(`  WARNING: the sample is much larger than pid ${rendererPid}'s live objects — wrong process?`);
  }

  const report = (label, skipGeneric) => {
    const by = new Map();
    for (const sample of samples) {
      const key = pick(sample.stack, skipGeneric);
      by.set(key, (by.get(key) ?? 0) + sample.bytes);
    }
    console.log(`\n=== ${label} ===`);
    for (const [key, bytes] of [...by].sort((a, b) => b[1] - a[1]).slice(0, 30)) {
      console.log(`${String(MB(bytes)).padStart(9)} MB  ${key.length > 130 ? `${key.slice(0, 130)}…` : key}`);
    }
  };
  report('bytes by allocating call site', false);
  report('bytes by first caller outside a container or string', true);

  // A sample is charged to the first category in this list any of its frames matches, so
  // the order is the priority and an overlap resolves upwards, not by stack position.
  const CATEGORIES = [
    [
      'IndexedDB, including what its callbacks do',
      /blink::mojom::(blink::)?IDB|blink::IDB|IDBDatabase_|IDBTransaction|IDBRequest/,
    ],
    [
      'performance.measure(…, {detail}) clones',
      /blink::PerformanceMeasure::|blink::UserTiming::|blink::Performance::Measure/,
    ],
    [
      'script source: fetch, decode, retain',
      /blink::ScriptDecoder|blink::TextResource(Decoder)?::|blink::ScriptResource::|blink::ModuleScript::|blink::ModuleRecordResolver|blink::CachedMetadata/,
    ],
    [
      'WebAssembly compile and code',
      /v8::internal::wasm::|WasmStreaming|ForWasmStreaming|v8::internal::trap_handler::/,
    ],
    [
      'font shaping tables',
      /HarfBuzz|hb_shape|^OT::|^AAT::|SkTypeface|SkScalerContext|blink::(FontPlatformData|SimpleFontData|ShapeResult)/,
    ],
    [
      'structured clone elsewhere (postMessage, storage)',
      /V8ScriptValueSerializer|SerializedScriptValue|v8::internal::ValueSerializer|blink::MessagePort/,
    ],
    [
      'V8 heap pages and isolate tables',
      /v8::internal::(MemoryAllocator|NormalPage|TracedHandles|StringTable|ThreadIsolation|Isolate::Init)|gin::IsolateHolder/,
    ],
    [
      'network and streams',
      /blink::(ResourceLoader|ResponseBodyLoader|ResourceFetcher|BytesConsumer|DataPipeBytesConsumer|FetchDataLoader|FetchHeaderList)|URLLoader/,
    ],
    ['mojo plumbing', /^mojo::|^ipcz::|^MojoCreate/],
    [
      'DOM, CSS, paint',
      /blink::(Element|CSSStyle|StyleResolver|LayoutObject|PaintLayer|PendingLayer|Document|PathBuilder)/,
    ],
    [
      'Blink strings not covered above',
      /blink::(StringImpl|AtomicString|StringCache|String)|SmallStringCache|ToBlinkString|TextCodec/,
    ],
  ];
  const buckets = new Map(CATEGORIES.map(([name]) => [name, 0]));
  let uncategorised = 0;
  for (const sample of samples) {
    const hit = CATEGORIES.find(([, pattern]) => sample.stack.some((frame) => pattern.test(frame)));
    if (hit) {
      buckets.set(hit[0], buckets.get(hit[0]) + sample.bytes);
    } else {
      uncategorised += sample.bytes;
    }
  }
  const wasmTotal = [...wasmByModule.values()].reduce((sum, bytes) => sum + bytes, 0);
  if (wasmTotal) {
    console.log(`\n=== committed WebAssembly.Memory (in no allocator node) ===`);
    for (const [key, bytes] of [...wasmByModule].sort((a, b) => b[1] - a[1])) {
      console.log(`${String(MB(bytes)).padStart(9)} MB  ${key}`);
    }
    console.log(`${String(MB(wasmTotal)).padStart(9)} MB  total`);
  }

  if (idbCalls.size) {
    console.log('\n=== IndexedDB reads, by JS call site ===');
    for (const [key, count] of [...idbCalls].sort((a, b) => b[1] - a[1]).slice(0, 8)) {
      console.log(`  x${String(count).padStart(5)}  ${key.slice(0, 200)}`);
    }
  }

  if (measureCalls.size) {
    console.log('\n=== performance.measure, by JS call site (detail as JSON) ===');
    for (const [key, entry] of [...measureCalls].sort((a, b) => b[1].detailBytes - a[1].detailBytes).slice(0, 8)) {
      console.log(
        `  ${String(MB(entry.detailBytes)).padStart(7)} MB  x${String(entry.count).padStart(5)}  ${key.slice(0, 220)}`,
      );
    }
  }

  console.log('\n=== by mechanism ===');
  for (const [name, bytes] of [...buckets, ['uncategorised', uncategorised]].sort((a, b) => b[1] - a[1])) {
    if (bytes > 0) {
      console.log(
        `${String(MB(bytes)).padStart(9)} MB  ${`${((bytes / sampled) * 100).toFixed(1)}%`.padStart(6)}  ${name}`,
      );
    }
  }

  if (jsonOut) {
    try {
      writeFileSync(
        jsonOut,
        JSON.stringify({
          footprint,
          modules,
          rate,
          rendererPid,
          idbCalls: Object.fromEntries(idbCalls),
          measureCalls: Object.fromEntries(measureCalls),
          wasmByModule: Object.fromEntries(wasmByModule),
          sampled,
          samples,
          settleS,
          totals,
          unresolved,
          url,
          version: version.Browser,
        }),
      );
      console.log(`\nwrote ${jsonOut}`);
    } catch (error) {
      // A failed write must not discard a measurement that took minutes to take.
      console.error(`could not write ${jsonOut}: ${error.message}`);
    }
  }
  cdp.close();
} finally {
  await shutdown();
}
