//
// Copyright 2026 DXOS.org
//

//
// Worker thread for `render-diagrams.tsx`: routes the layout candidates it is sent, so a diagram's
// candidates route on every core instead of one. It inherits the parent's tsx loader and `source`
// condition, so it runs the same `@dxos/diagram` source as the main thread.
//

import { parentPort } from 'node:worker_threads';

import { MermaidEngine } from '@dxos/diagram';

parentPort?.on('message', (job: MermaidEngine.EmitJob) => {
  parentPort?.postMessage(MermaidEngine.emitJob(job));
});
