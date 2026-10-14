//
// Copyright 2026 DXOS.org
//

//
// Worker thread for `render-diagrams.tsx`: routes the layout candidates it is sent, so a diagram's
// candidates route on every core instead of one. It inherits the parent's tsx loader and `source`
// condition, so it runs the same `@dxos/diagram` source as the main thread.
//

import { parentPort } from 'node:worker_threads';

import { MermaidEngine, type Scene } from '@dxos/diagram';

/** One reply per job: its scene commands, or why routing it failed, so the worker outlives a bad job. */
export type Reply = { commands: Scene.Command[] } | { error: string };

parentPort?.on('message', (job: MermaidEngine.EmitJob) => {
  let reply: Reply;
  try {
    reply = { commands: MermaidEngine.emitJob(job) };
  } catch (error) {
    reply = { error: error instanceof Error ? (error.stack ?? error.message) : String(error) };
  }
  parentPort?.postMessage(reply);
});
