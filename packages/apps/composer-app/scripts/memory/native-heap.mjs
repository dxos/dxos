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
 * `fetch-electron.sh` once to download both.
 *
 * Usage: node native-heap.mjs <url> [--settle 90] [--rate 10000] [--json out.json]
 *        [--electron <Electron.app>] [--symbols <Electron Framework.sym>]
 */

import { spawn } from 'node:child_process';
import { createReadStream, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createInterface } from 'node:readline';

const url = process.argv[2]?.startsWith('--') ? 'http://localhost:4173' : (process.argv[2] ?? 'http://localhost:4173');
const arg = (name, dflt) => {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : dflt;
};
const settleS = parseFloat(arg('--settle', '90'));
// The mean bytes between samples. Large allocations are captured near-exactly at any
// setting; this only controls how well the long tail of small ones is estimated.
const rate = parseInt(arg('--rate', '10000'), 10);
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
 * FUNC records from a breakpad .sym, sorted by module-relative address.
 *
 * The .sym is ~700 MB of text and only its FUNC lines matter, so the extract is cached
 * beside it; rebuilding costs a few seconds, reading the original costs far more.
 */
const loadSymbols = async (file) => {
  const cache = `${file}.funcs.tsv`;
  if (!existsSync(cache)) {
    const rows = [];
    const lines = createInterface({ input: createReadStream(file, { highWaterMark: 1 << 22 }), crlfDelay: Infinity });
    for await (const line of lines) {
      if (!line.startsWith('FUNC ')) {
        continue;
      }
      // FUNC [m] <address> <size> <parameter_size> <name>, all hex but the name.
      const rest = line.slice(5).replace(/^m /, '');
      const a = rest.indexOf(' ');
      const b = rest.indexOf(' ', a + 1);
      const c = rest.indexOf(' ', b + 1);
      if (c > 0) {
        rows.push([parseInt(rest.slice(0, a), 16), parseInt(rest.slice(a + 1, b), 16), rest.slice(c + 1)]);
      }
    }
    rows.sort((x, y) => x[0] - y[0]);
    writeFileSync(cache, rows.map((r) => `${r[0].toString(16)}\t${r[1].toString(16)}\t${r[2]}`).join('\n'));
    console.error(`  indexed ${rows.length} functions -> ${cache}`);
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
    starts.push(parseInt(line.slice(0, a), 16));
    sizes.push(parseInt(line.slice(a + 1, b), 16));
    names.push(line.slice(b + 1));
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
    // Only inside the function's own extent: the nearest preceding symbol to an address
    // in a gap belongs to something else and would name the wrong caller.
    return best >= 0 && offset < starts[best] + sizes[best] ? names[best] : null;
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
          fn(message.params);
        }
      }
    });
    return cdp;
  }

  send(method, params = {}, timeoutMs = 180_000) {
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
      this.#ws.send(JSON.stringify({ id, method, params }));
    });
  }

  trySend(method, params, timeoutMs) {
    return this.send(method, params, timeoutMs).catch(() => undefined);
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
  JSON.stringify({ name: 'native-heap', version: '1.0.0', main: 'main.js' }),
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

const shutdown = () => {
  child.kill('SIGKILL');
  rmSync(appDir, { force: true, recursive: true });
};

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
  await cdp.send('Page.enable');
  await cdp.send('Memory.startSampling', { samplingInterval: rate, suppressRandomness: false });
  await cdp.send('Page.navigate', { url });
  console.error(`navigated; settling ${settleS}s ...`);
  await new Promise((resolve) => setTimeout(resolve, settleS * 1000));

  // The sampler drops a sample when its allocation is freed, so a collection first is what
  // makes the result retention rather than churn. Every realm has its own isolate to collect.
  await cdp.trySend('HeapProfiler.enable', {}, GC_TIMEOUT_MS);
  await cdp.trySend('HeapProfiler.collectGarbage', {}, GC_TIMEOUT_MS);
  const realms = await fetch(`http://127.0.0.1:${port}/json/list`)
    .then((response) => response.json())
    .catch(() => []);
  for (const realm of realms) {
    if (realm.type === 'page' || !realm.webSocketDebuggerUrl) {
      continue;
    }
    try {
      const worker = await Promise.race([
        Cdp.connect(realm.webSocketDebuggerUrl),
        new Promise((_, reject) => setTimeout(() => reject(new Error('connect timed out')), GC_TIMEOUT_MS).unref?.()),
      ]);
      await worker.trySend('HeapProfiler.enable', {}, GC_TIMEOUT_MS);
      await worker.trySend('HeapProfiler.collectGarbage', {}, GC_TIMEOUT_MS);
      worker.close();
    } catch {
      // A realm that went away between the listing and the connect is not an error.
    }
  }
  await new Promise((resolve) => setTimeout(resolve, 3000));

  const { profile } = await cdp.send('Memory.getSamplingProfile');

  // The allocator ledger for the same renderer, so the sample can be read as a share of it.
  const events = [];
  cdp.on('Tracing.dataCollected', ({ value }) => events.push(...value));
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
  const symbolize = (address) => {
    const value = Number(BigInt(address));
    if (framework && value >= framework.base && value < framework.end) {
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
  // the caller one frame further down does.
  const GENERIC =
    /StringImpl::(Create|Allocate)|StringBuffer|StringBuilder|CharacterBuffer|VectorBuffer|Vector<.*>::(expand|reserve|Grow|Reallocate|append)|HashTable<.*>::(Rehash|expand)|::(ReserveCapacity|AllocateBuffer|resize|Resize|reserve|insert|__emplace)\b|__hash_table|__tree|__add_back_capacity|absl::container_internal|MakeGarbageCollected|std::__Cr::(vector|deque|basic_string|unique_ptr|shared_ptr|function|__function)/;
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

  const totals = {};
  let footprint = 0;
  let rendererPid = null;
  for (const event of events) {
    const dumps = event.args?.dumps;
    if (event.ph !== 'v' || !dumps) {
      continue;
    }
    const raw = dumps.process_totals?.private_footprint_bytes;
    if (raw && parseInt(raw, 16) > footprint) {
      footprint = parseInt(raw, 16);
      rendererPid = event.pid;
    }
  }
  for (const event of events) {
    if (event.ph !== 'v' || event.pid !== rendererPid) {
      continue;
    }
    for (const [name, node] of Object.entries(event.args?.dumps?.allocators ?? {})) {
      const raw = node.attrs?.size ?? node.attrs?.effective_size;
      if (raw) {
        totals[name] = parseInt(raw.value, 16);
      }
    }
  }
  // The GPU process can out-footprint the renderer, so pick the one the sample came from:
  // the only process with a PartitionAlloc tree is a renderer.
  if (!totals.partition_alloc) {
    for (const event of events) {
      if (event.ph !== 'v' || !event.args?.dumps?.allocators?.partition_alloc) {
        continue;
      }
      rendererPid = event.pid;
      for (const [name, node] of Object.entries(event.args.dumps.allocators)) {
        const raw = node.attrs?.size ?? node.attrs?.effective_size;
        if (raw) {
          totals[name] = parseInt(raw.value, 16);
        }
      }
      footprint = 0;
      for (const other of events) {
        const raw = other.pid === rendererPid ? other.args?.dumps?.process_totals?.private_footprint_bytes : null;
        if (raw) {
          footprint = Math.max(footprint, parseInt(raw, 16));
        }
      }
      break;
    }
  }

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

  // First match wins, so a `TextEncoder` call inside an IndexedDB callback is charged to
  // the read that provoked it rather than to encoding in general.
  const CATEGORIES = [
    [
      'IndexedDB reads, and what their callbacks do',
      /IDBDatabase_Get|IDBValueDataView|IDBRecordDataView|IDBFactory|blink::IDBKey|IDBTransaction|IDBRequest/,
    ],
    ['performance.measure(…, {detail}) clones', /PerformanceMeasure::Create|UserTiming::Measure|Performance::Measure/],
    [
      'script source: fetch, decode, retain',
      /ScriptDecoder|TextResource::DecodedText|ScriptResource::GetSourceText|ModuleScript::ResolveModuleSpecifier|ModuleRecordResolver|CachedMetadata/,
    ],
    ['WebAssembly compile and code', /wasm|Wasm/],
    [
      'font shaping tables',
      /HarfBuzz|hb_shape|^OT::|^AAT::|SkTypeface|SkScalerContext|FontPlatformData|SimpleFontData/,
    ],
    [
      'structured clone elsewhere (postMessage, storage)',
      /V8ScriptValueSerializer|SerializedScriptValue|ValueSerializer|MessagePort/,
    ],
    [
      'V8 heap pages and isolate tables',
      /MemoryAllocator::Allocate|NormalPage::|TracedHandles|StringTable::|ThreadIsolation|Isolate::Init|IsolateHolder/,
    ],
    [
      'network and streams',
      /ResourceLoader|ResponseBodyLoader|BytesConsumer|FetchDataLoader|TeeHelper|URLLoader|FetchHeaderList/,
    ],
    ['mojo plumbing', /mojo::|ipcz::|MojoCreate/],
    ['DOM, CSS, paint', /Element|CSSStyle|StyleResolver|LayoutObject|PaintLayer|PendingLayer|Document::|PathBuilder/],
    ['Blink strings not covered above', /StringImpl|AtomicString|SmallStringCache|StringCache|ToBlinkString|TextCodec/],
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
    writeFileSync(
      jsonOut,
      JSON.stringify({ footprint, rate, sampled, samples, settleS, totals, url, version: version.Browser }),
    );
    console.log(`\nwrote ${jsonOut}`);
  }
} finally {
  shutdown();
}
