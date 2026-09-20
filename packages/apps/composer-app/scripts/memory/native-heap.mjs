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
 * `fetch-electron.sh` once to download both. macOS arm64 only, as written.
 *
 * The profile is one process wide and does not separate `malloc` from PartitionAlloc, so
 * read it as a decomposition of the two together.
 *
 * Usage: node native-heap.mjs <url> [--settle 90] [--rate 10000] [--json out.json]
 *        [--electron <Electron.app>] [--symbols <Electron Framework.sym>]
 */

import { spawn } from 'node:child_process';
import { createReadStream, existsSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createInterface } from 'node:readline';

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
const jsonOut = arg('--json', null);
const electronRoot = arg('--electron', process.env.ELECTRON_APP ?? './tmp/electron/Electron.app');
const symFile = arg('--symbols', process.env.ELECTRON_SYMBOLS ?? null);
const port = parseInt(process.env.NATIVE_HEAP_PORT ?? '9402', 10);
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
const loadSymbols = async (file) => {
  const cache = `${file}.ranges.tsv`;
  if (!existsSync(cache)) {
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
    writeFileSync(written, rows.map((r) => `${r[0].toString(16)}\t${r[1].toString(16)}\t${r[2]}`).join('\n'));
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
    if (a < 0) {
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
const lookup = await loadSymbols(symFile);

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
  env: { ...process.env, PROBE_PORT: String(port) },
});
let childLog = '';
child.stdout.on('data', (chunk) => (childLog += chunk));
child.stderr.on('data', (chunk) => (childLog += chunk));

let cleaned = false;
const shutdown = () => {
  if (cleaned) {
    return;
  }
  cleaned = true;
  // SIGTERM first so the browser tears its helper processes down itself; SIGKILL on the
  // parent alone would orphan the renderer, which is the 300 MB one.
  child.kill('SIGTERM');
  setTimeout(() => child.kill('SIGKILL'), 2000).unref?.();
  rmSync(appDir, { force: true, recursive: true });
};
for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(signal, () => {
    shutdown();
    process.exit(130);
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
  const workerSessions = new Set();
  cdp.on('Target.attachedToTarget', ({ sessionId, targetInfo }) => {
    if (['iframe', 'service_worker', 'shared_worker', 'worker'].includes(targetInfo.type)) {
      workerSessions.add(sessionId);
    }
  });
  cdp.on('Target.detachedFromTarget', ({ sessionId }) => workerSessions.delete(sessionId));
  await cdp.trySend('Target.setAutoAttach', { autoAttach: true, flatten: true, waitForDebuggerOnStart: false });
  await cdp.send('Page.enable');
  await cdp.send('Memory.startSampling', { samplingInterval: rate, suppressRandomness: false });
  await cdp.send('Page.navigate', { url });
  console.error(`navigated; settling ${settleS}s ...`);
  await new Promise((resolve) => setTimeout(resolve, settleS * 1000));

  // The sampler drops a sample when its allocation is freed, so a collection first is what
  // makes the result retention rather than churn. Each realm has its own isolate.
  await cdp.trySend('HeapProfiler.enable', {}, { timeoutMs: GC_TIMEOUT_MS });
  await cdp.trySend('HeapProfiler.collectGarbage', {}, { timeoutMs: GC_TIMEOUT_MS });
  let collected = 0;
  for (const sessionId of workerSessions) {
    await cdp.trySend('HeapProfiler.enable', {}, { sessionId, timeoutMs: GC_TIMEOUT_MS });
    const result = await cdp.trySend('HeapProfiler.collectGarbage', {}, { sessionId, timeoutMs: GC_TIMEOUT_MS });
    if (result) {
      collected++;
    }
  }
  console.error(`  collected ${collected + 1} of ${workerSessions.size + 1} realms`);
  await new Promise((resolve) => setTimeout(resolve, 3000));

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
  await Promise.race([complete, new Promise((resolve) => setTimeout(resolve, 120_000))]);

  const modules = profile.modules.map((module) => ({
    base: Number(BigInt(module.baseAddress)),
    end: Number(BigInt(module.baseAddress)) + Number(module.size),
    name: module.name.replace(/^.*\//, ''),
  }));
  const framework = modules.find((module) => /Electron Framework/.test(module.name));
  if (!framework) {
    throw new Error(`the profile carries no Electron Framework module: ${modules.map((m) => m.name).join(', ')}`);
  }
  const UNRESOLVED = /^(Electron Framework|[^+]+)\+0x[0-9a-f]+$|^0x[0-9a-f]+$/;
  const symbolize = (address) => {
    let value;
    try {
      value = Number(BigInt(address));
    } catch {
      return String(address);
    }
    if (value >= framework.base && value < framework.end) {
      return lookup(value - framework.base) ?? `Electron Framework+0x${(value - framework.base).toString(16)}`;
    }
    const module = modules.find((candidate) => value >= candidate.base && value < candidate.end);
    return module ? `${module.name}+0x${(value - module.base).toString(16)}` : `0x${value.toString(16)}`;
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
    return stack.find((frame) => !isPlumbing(frame)) ?? stack.at(-1) ?? '<empty stack>';
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
    .filter((sample) => UNRESOLVED.test(pick(sample.stack, false)))
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
  const renderers = [...perPid].filter(([, entry]) => entry.allocators.partition_alloc != null);
  // Matched on the allocator total the profile itself explains: the sampled bytes are a
  // subset of this renderer's live objects, so the right process is the one large enough
  // to hold them, and among several that is reliably the largest.
  const [rendererPid, renderer] = renderers.sort((a, b) => b[1].footprint - a[1].footprint)[0] ?? [null, null];
  if (!renderer) {
    throw new Error('the memory dump contains no renderer process');
  }
  if (renderers.length > 1) {
    console.error(
      `  ${renderers.length} renderers in the dump; reading pid ${rendererPid} (${MB(renderer.footprint)} MB), ` +
        `others ${renderers
          .filter(([pid]) => pid !== rendererPid)
          .map(([pid, entry]) => `${pid}@${MB(entry.footprint)}MB`)
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
  shutdown();
}
