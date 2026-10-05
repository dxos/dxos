//
// Copyright 2026 DXOS.org
//

import { MermaidEngine, type Scene } from '@dxos/diagram';

/**
 * Routes one layout candidate (`MermaidEngine.emitJob`) for the layout worker, which keeps a pool of
 * these so a diagram's candidates route on every core instead of one, as `render-diagrams` does.
 */

export type RouteRequest = { readonly id: number; readonly job: MermaidEngine.EmitJob };

export type RouteReply =
  | { readonly id: number; readonly commands: Scene.Command[] }
  | { readonly id: number; readonly error: string };

self.addEventListener('message', (event: MessageEvent<RouteRequest>) => {
  const { id, job } = event.data;
  try {
    self.postMessage({ id, commands: MermaidEngine.emitJob(job) } satisfies RouteReply);
  } catch (cause) {
    self.postMessage({ id, error: cause instanceof Error ? cause.message : String(cause) } satisfies RouteReply);
  }
});
