//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { ClientService } from '@dxos/client';

import { getLocalSandboxBackend } from '#local-backend';

import * as SandboxService from '../types/SandboxService.ts';
import { makeEdgeBackend } from './edge-backend.ts';

/** Environment variable selecting the backend: `local` runs sandboxes on this machine, anything else on EDGE. */
export const SANDBOX_BACKEND_ENV = 'DX_SANDBOX_BACKEND';

/** Sandboxes on EDGE, authenticated as the client's identity. */
export const layerEdge: Layer.Layer<SandboxService.Service, never, ClientService> = Layer.effect(
  SandboxService.Service,
  Effect.gen(function* () {
    return makeEdgeBackend(yield* ClientService);
  }),
);

/**
 * Sandboxes on this machine. Only Node and Bun can spawn processes; elsewhere every call fails,
 * rather than the layer, so a runtime that never uses a sandbox is not broken by asking for one.
 */
export const layerLocal: Layer.Layer<SandboxService.Service> = Layer.sync(
  SandboxService.Service,
  () => getLocalSandboxBackend() ?? unavailable('This runtime cannot run local sandboxes.'),
);

/**
 * EDGE unless `DX_SANDBOX_BACKEND=local`. Asking for local where it cannot run is an error rather
 * than a silent fall back to EDGE, since the caller chose local to keep work off the network.
 */
export const layer: Layer.Layer<SandboxService.Service, never, ClientService> = Layer.unwrap(
  Effect.sync(() => {
    const preference = typeof process === 'undefined' ? undefined : process.env?.[SANDBOX_BACKEND_ENV];
    return preference === 'local' ? layerLocal : layerEdge;
  }),
);

const unavailable = (message: string): SandboxService.Backend => {
  const fail = () => Effect.fail(new SandboxService.SandboxError({ message }));
  return { kind: 'local', create: fail, exec: fail, readFileBytes: fail, writeFile: fail, listFiles: fail };
};
