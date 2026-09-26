//
// Copyright 2026 DXOS.org
//

// What one realm holds for a corpus: tab documents (the model, no Automerge) or Automerge replicas.
// Each mode runs in its own worker thread, so the figures are that realm's alone: its V8 heap plus its
// external memory (array buffers, typed arrays and wasm memory).
// Usage: node --expose-gc --conditions=source src/bench/memory.ts <corpus.json>

import { readFileSync } from 'node:fs';
import v8 from 'node:v8';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';

type Corpus = { docs: { kind: string; bytes: string }[] };
type Result = { mode: string; heap: number; wasm: number; ms: number; ops: number };

const gc = async (): Promise<void> => {
  const collect: unknown = Reflect.get(globalThis, 'gc');
  for (let i = 0; i < 4; i++) {
    if (typeof collect === 'function') {
      Reflect.apply(collect, globalThis, []);
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
};

const isResult = (value: unknown): value is Result =>
  typeof value === 'object' && value !== null && 'mode' in value && 'heap' in value && 'wasm' in value;

if (isMainThread) {
  // Imported here, not at the top: a worker thread that measures tab documents must not load Automerge.
  const A = await import('@automerge/automerge');
  // The worker would send the tab uncompressed bytes; the corpus holds compressed saves.
  const { saveNoCompress } = await import('../save.ts');
  const { packHashes } = await import('../changes.ts');
  const corpus: Corpus = JSON.parse(readFileSync(process.argv[2], 'utf8'));
  const docs = corpus.docs.map((entry) => A.load(Uint8Array.from(Buffer.from(entry.bytes, 'base64'))));
  const payload = {
    compressed: corpus.docs.map((entry) => Buffer.from(entry.bytes, 'base64')),
    plain: docs.map(saveNoCompress),
    hashes: docs.map((doc) => packHashes(A.getAllChanges(doc).map((change) => A.decodeChange(change).hash))),
  };
  const run = (mode: string) =>
    new Promise<Result>((resolve, reject) => {
      const worker = new Worker(new URL(import.meta.url), { workerData: { mode }, execArgv: ['--conditions=source'] });
      worker.on('message', (message: unknown) => {
        if (message === 'ready') {
          worker.postMessage(payload);
        } else if (isResult(message)) {
          resolve(message);
          void worker.terminate();
        } else {
          reject(new Error(`Unexpected message from ${mode}`));
        }
      });
      worker.on('error', reject);
    });
  const mb = (bytes: number) => (bytes / 1048576).toFixed(2);
  for (const mode of ['empty', 'replica', 'tab', 'tab-hashed', 'replica', 'tab', 'tab-hashed']) {
    const result = await run(mode);
    console.log(
      mode.padEnd(11),
      'heap + external',
      mb(result.heap),
      'MB  (of which wasm',
      mb(result.wasm),
      'MB)  load',
      result.ms.toFixed(0),
      'ms  ops',
      result.ops,
    );
  }
} else {
  const memories = new Set<WebAssembly.Memory>();
  const track = (instance: WebAssembly.Instance) =>
    Object.values(instance.exports).forEach((value) => value instanceof WebAssembly.Memory && memories.add(value));
  const Instance = WebAssembly.Instance;
  WebAssembly.Instance = new Proxy(Instance, {
    construct: (target, args, newTarget) => {
      const instance = Reflect.construct(target, args, newTarget);
      track(instance);
      return instance;
    },
  });
  let held: unknown;
  parentPort?.once(
    'message',
    async (payload: { compressed: Uint8Array[]; plain: Uint8Array[]; hashes: Uint8Array[] }) => {
      // Each mode loads only its own code, before the clock starts, so the time is the documents' alone.
      const tab = workerData.mode === 'tab' || workerData.mode === 'tab-hashed';
      const A = workerData.mode === 'replica' ? await import('@automerge/automerge') : undefined;
      const Model = tab ? (await import('../model.ts')).Model : undefined;
      const start = performance.now();
      let ops = 0;
      if (A) {
        held = payload.compressed.map((bytes) => A.load(bytes));
      } else if (Model) {
        // `tab` computes each change's hash from the bytes; `tab-hashed` is told them, as the worker can.
        held = payload.plain.map((bytes, index) =>
          workerData.mode === 'tab' ? Model.fromSaved(bytes) : Model.fromSaved(bytes, payload.hashes[index]),
        );
      }
      const ms = performance.now() - start;
      if (tab) {
        const { readSavedColumns } = await import('../reader.ts');
        ops = payload.plain.reduce((sum, bytes) => sum + readSavedColumns(bytes).ops.count, 0);
      }
      // Only what the mode built stays: the input goes before the heap is read.
      payload.compressed.length = 0;
      payload.plain.length = 0;
      payload.hashes.length = 0;
      await gc();
      // External memory holds array buffers, typed arrays and wasm memory, which the heap figure leaves out.
      const statistics = v8.getHeapStatistics();
      parentPort?.postMessage({
        mode: workerData.mode,
        heap: statistics.used_heap_size + statistics.external_memory,
        wasm: [...memories].reduce((sum, memory) => sum + memory.buffer.byteLength, 0),
        ms,
        ops,
      } satisfies Result);
      void held;
    },
  );
  parentPort?.postMessage('ready');
}
