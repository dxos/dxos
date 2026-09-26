//
// Copyright 2026 DXOS.org
//

// The worker that holds manifold's wasm and runs its jobs.

import { type MeshArrays, loadManifold, unionOfSpheres } from './manifold-job.ts';
import { serveWasmJobs } from './wasm-worker.ts';

type Request = { count: number; segments: number };

const manifold = loadManifold();

serveWasmJobs<Request, MeshArrays>(async ({ count, segments }) => {
  const mesh = unionOfSpheres(await manifold, count, segments);
  return { response: mesh, transfer: [mesh.vertices.buffer, mesh.triangles.buffer] };
});
