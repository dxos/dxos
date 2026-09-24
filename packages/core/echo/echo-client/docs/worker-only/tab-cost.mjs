//
// Copyright 2026 DXOS.org
//

// Measures what one tab holds for a corpus: an Automerge replica versus a JSON mirror.
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
  const run = (mode) =>
    new Promise((resolve, reject) => {
      const worker = new Worker(new URL(import.meta.url), { workerData: { mode } });
      worker.on('message', (msg) => {
        if (msg.ready) {
          worker.postMessage(mode === 'mirror' ? { mirrors } : mode === 'replica' ? { bytes } : {});
        } else {
          resolve(msg);
          worker.terminate();
        }
      });
      worker.on('error', reject);
    });
  const results = {};
  for (const mode of ['empty', 'replica', 'mirror', 'replica', 'mirror']) {
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
    if (workerData.mode === 'replica') {
      const A = require('@automerge/automerge');
      // As DocHandleProxy does: load the host's bytes, then read the document.
      held = msg.bytes.map((b) => A.loadIncremental(A.init(), new Uint8Array(b)));
      let chars = 0;
      for (const doc of held) {
        chars += JSON.stringify(doc).length;
      }
      note = `docs ${held.length}, json chars ${chars}`;
    } else if (workerData.mode === 'mirror') {
      held = msg.mirrors;
      const freeze = (v) => {
        if (v && typeof v === 'object') {
          Object.values(v).forEach(freeze);
          Object.freeze(v);
        }
        return v;
      };
      held.forEach(freeze);
      note = `docs ${held.length}`;
    }
    await settle();
    const heap = v8.getHeapStatistics().used_heap_size;
    parentPort.postMessage({ heap, wasm: wasmBytes(), note });
  });
  parentPort.postMessage({ ready: true });
}
