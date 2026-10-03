//
// Copyright 2026 DXOS.org
//

//
// Worker thread for `render-diagrams.tsx`: routes the layout candidates it is sent, so a diagram's
// candidates route on every core instead of one. Runs under plain Node (type stripping), which
// resolves `@dxos/diagram` to its built dist, as the render task's `^:build` dependency provides.
//

import { parentPort } from 'node:worker_threads';

import { MermaidEngine } from '@dxos/diagram';

parentPort?.on('message', ({ id, job }: { id: number; job: MermaidEngine.EmitJob }) => {
  parentPort?.postMessage({ id, commands: MermaidEngine.emitJob(job) });
});
