//
// Copyright 2026 DXOS.org
//

// A page that runs the same CSG job in the page itself, or through a worker it releases afterwards.

import { loadManifold, unionOfSpheres } from './manifold-job.ts';
import { WasmWorker } from './wasm-worker.ts';

type Job = { count: number; segments: number };

const settle = async (): Promise<number> => {
  const collect: unknown = Reflect.get(globalThis, 'gc');
  for (let i = 0; i < 6; i++) {
    if (typeof collect === 'function') {
      Reflect.apply(collect, globalThis, []);
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  const memory: unknown = Reflect.get(performance, 'memory');
  return typeof memory === 'object' && memory !== null ? Number(Reflect.get(memory, 'usedJSHeapSize')) : NaN;
};

/** The page's memory plus its workers', as Chrome attributes it. */
const total = async (): Promise<number> => {
  const measure: unknown = Reflect.get(performance, 'measureUserAgentSpecificMemory');
  if (typeof measure !== 'function') {
    return NaN;
  }
  const result: unknown = await Reflect.apply(measure, performance, []);
  return typeof result === 'object' && result !== null ? Number(Reflect.get(result, 'bytes')) : NaN;
};

Reflect.set(globalThis, 'inPage', async (job: Job) => {
  const before = await settle();
  const manifold = await loadManifold();
  let mesh: ReturnType<typeof unionOfSpheres> | undefined = unionOfSpheres(manifold, job.count, job.segments);
  const triangles = mesh.triangles.length / 3;
  const during = await settle();
  mesh = undefined;
  void mesh;
  const after = await settle();
  return { before, during, after, triangles, total: await total() };
});

Reflect.set(globalThis, 'viaWorker', async (job: Job) => {
  const before = await settle();
  const worker = new WasmWorker<Job, { vertices: Float32Array; triangles: Uint32Array }>('/manifold-in-worker.js');
  let mesh: { triangles: Uint32Array } | undefined = await worker.call(job);
  const triangles = mesh.triangles.length / 3;
  const during = await settle();
  const totalRunning = await total();
  mesh = undefined;
  void mesh;
  worker.release();
  const after = await settle();
  return { before, during, after, triangles, totalRunning, total: await total() };
});
