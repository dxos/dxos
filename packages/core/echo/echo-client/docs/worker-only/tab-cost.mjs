//
// Copyright 2026 DXOS.org
//

// Measures what one tab holds for a corpus: an Automerge replica, a JSON mirror, or mirrors plus one replica.
// Each mode runs in its own worker thread, so wasm memory and V8 heap are that realm's alone.
// Usage: node --expose-gc tab-cost.mjs <corpus.json>
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import v8 from 'node:v8';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';

const require = createRequire(new URL('../../package.json', import.meta.url));

if (isMainThread) {
  const corpus = JSON.parse(readFileSync(process.argv[2], 'utf8'));
  const A = require('@automerge/automerge');
  // The worker holds every document; mirrors are what it would send a tab (structured clone).
  const docs = corpus.docs.map((d) => A.load(new Uint8Array(Buffer.from(d.bytes, 'base64'))));
  const plain = (v) =>
    Array.isArray(v)
      ? v.map(plain)
      : v && typeof v === 'object' && Object.getPrototypeOf(v) === Object.prototype
        ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, plain(x)]))
        : v instanceof A.RawString
          ? { raw: v.toString() }
          : v;
  const mirrors = docs.map((doc) => plain(doc));
  const bytes = corpus.docs.map((d) => Buffer.from(d.bytes, 'base64'));
  // The hybrid tab hands one long document to an Automerge library as a replica and mirrors the rest.
  const handedOver = corpus.docs.findIndex((d) => d.kind === 'document');
  const payloads = {
    empty: {},
    module: {},
    replica: { bytes },
    mirror: { mirrors },
    hybrid: { bytes: [bytes[handedOver]], mirrors: mirrors.filter((_, index) => index !== handedOver) },
  };
  const run = (mode) =>
    new Promise((resolve, reject) => {
      const worker = new Worker(new URL(import.meta.url), { workerData: { mode } });
      worker.on('message', (msg) => {
        if (msg.ready) {
          worker.postMessage(payloads[mode]);
        } else {
          resolve(msg);
          worker.terminate();
        }
      });
      worker.on('error', reject);
    });
  const results = {};
  for (const mode of ['empty', 'module', 'replica', 'mirror', 'hybrid', 'module', 'replica', 'mirror', 'hybrid']) {
    const r = await run(mode);
    results[mode] ??= [];
    results[mode].push(r);
  }
  const mb = (x) => (x / 1048576).toFixed(2);
  for (const [mode, runs] of Object.entries(results)) {
    for (const r of runs) {
      console.log(
        mode.padEnd(8),
        'heap',
        mb(r.heap),
        'MB  wasm',
        mb(r.wasm),
        'MB  total',
        mb(r.heap + r.wasm),
        'MB',
        r.note ?? '',
      );
    }
  }
} else {
  // Record every wasm memory this realm creates before Automerge can load.
  const memories = new Set();
  const track = (instance) => {
    for (const v of Object.values(instance.exports)) {
      if (v instanceof WebAssembly.Memory) {
        memories.add(v);
      }
    }
  };
  const oi = WebAssembly.instantiate;
  WebAssembly.instantiate = async (...args) => {
    const r = await oi(...args);
    track(r instanceof WebAssembly.Instance ? r : r.instance);
    return r;
  };
  const OI = WebAssembly.Instance;
  WebAssembly.Instance = new Proxy(OI, {
    construct(t, a, n) {
      const inst = Reflect.construct(t, a, n);
      track(inst);
      return inst;
    },
  });
  const wasmBytes = () => [...memories].reduce((n, m) => n + m.buffer.byteLength, 0);
  const settle = async () => {
    for (let i = 0; i < 4; i++) {
      globalThis.gc();
      await new Promise((r) => setTimeout(r, 50));
    }
  };

  let held;
  parentPort.once('message', async (msg) => {
    let note;
    const freeze = (v) => {
      if (v && typeof v === 'object') {
        Object.values(v).forEach(freeze);
        Object.freeze(v);
      }
      return v;
    };
    // As DocHandleProxy does: load the host's bytes, then read the document.
    const load = (all) => {
      const A = require('@automerge/automerge');
      const docs = all.map((b) => A.loadIncremental(A.init(), new Uint8Array(b)));
      let chars = 0;
      for (const doc of docs) {
        chars += JSON.stringify(doc).length;
      }
      return { docs, chars };
    };
    if (workerData.mode === 'module') {
      // What a tab pays before its first replica: the module and one empty document.
      held = load([]);
      held.docs.push(require('@automerge/automerge').init());
      note = 'no documents';
    } else if (workerData.mode === 'replica') {
      const { docs, chars } = load(msg.bytes);
      held = docs;
      note = `docs ${docs.length}, json chars ${chars}`;
    } else if (workerData.mode === 'mirror') {
      held = msg.mirrors.map(freeze);
      note = `docs ${held.length}`;
    } else if (workerData.mode === 'hybrid') {
      const { docs, chars } = load(msg.bytes);
      held = [...docs, ...msg.mirrors.map(freeze)];
      note = `replicas ${docs.length} (json chars ${chars}), mirrors ${msg.mirrors.length}`;
    }
    await settle();
    const heap = v8.getHeapStatistics().used_heap_size;
    parentPort.postMessage({ heap, wasm: wasmBytes(), note });
  });
  parentPort.postMessage({ ready: true });
}
