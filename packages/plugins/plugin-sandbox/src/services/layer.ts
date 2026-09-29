//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { ClientService } from '@dxos/client';

import { getLocalSandboxBackend } from '#local-backend';

import * as SandboxCapabilities from '../types/SandboxCapabilities.ts';
import * as SandboxService from '../types/SandboxService.ts';
import type * as Settings from '../types/Settings.ts';
import { makeEdgeBackend } from './edge-backend.ts';

/** Environment variable selecting the backend under Node or Bun; it overrides the plugin setting. */
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
  () => getLocalSandboxBackend() ?? unavailable(NO_LOCAL_RUNTIME),
);

/** EDGE unless `DX_SANDBOX_BACKEND=local`: for embedders and tests without a plugin runtime. */
export const layer: Layer.Layer<SandboxService.Service, never, ClientService> = Layer.effect(
  SandboxService.Service,
  Effect.gen(function* () {
    return selecting({
      edge: makeEdgeBackend(yield* ClientService),
      preference: () => envPreference() ?? 'edge',
      launcher: () => undefined,
    });
  }),
);

/**
 * The layer the plugin contributes: EDGE or local per the plugin setting (`DX_SANDBOX_BACKEND`
 * overrides it under Node or Bun), read on every call so a change applies without a restart. Where
 * this runtime cannot spawn processes, local sandboxes come from a contributed
 * {@link SandboxCapabilities.LocalLauncher} — the desktop app's helper process.
 */
export const layerFromCapabilities: Layer.Layer<SandboxService.Service, never, ClientService | Capability.Service> =
  Layer.effect(
    SandboxService.Service,
    Effect.gen(function* () {
      const edge = makeEdgeBackend(yield* ClientService);
      const capabilities = yield* Capability.Service;
      const setting = (): Settings.Backend | undefined => {
        const [settings] = capabilities.getAll(SandboxCapabilities.Settings);
        const [registry] = capabilities.getAll(Capabilities.AtomRegistry);
        return settings && registry ? registry.get(settings).backend : undefined;
      };
      return selecting({
        edge,
        preference: () => envPreference() ?? setting() ?? 'edge',
        launcher: () => capabilities.getAll(SandboxCapabilities.LocalLauncher)[0],
      });
    }),
  );

const NO_LOCAL_RUNTIME = 'Local sandboxes need the desktop app, or Node or Bun.';

const NO_PUBLISH = 'Publishing files needs a local sandbox in the desktop app.';

/**
 * A backend that picks EDGE or local per call. Asking for local where nothing can run it is an
 * error rather than a silent fall back to EDGE, since the caller chose local to keep work off the network.
 */
const selecting = ({
  edge,
  preference,
  launcher,
}: {
  edge: SandboxService.Backend;
  preference: () => Settings.Backend;
  launcher: () => SandboxCapabilities.LocalLauncher | undefined;
}): SandboxService.Backend => {
  const select: Effect.Effect<SandboxService.Backend, SandboxService.SandboxError> = Effect.suspend(() => {
    if (preference() !== 'local') {
      return Effect.succeed(edge);
    }
    // A contributed launcher is the host's own way to run them, so it wins; otherwise run in-process.
    const contributed = launcher();
    if (contributed) {
      return contributed.backend;
    }
    const direct = getLocalSandboxBackend();
    return direct
      ? Effect.succeed(direct)
      : Effect.fail(new SandboxService.SandboxError({ message: NO_LOCAL_RUNTIME }));
  });

  return {
    get kind() {
      return preference() === 'local' ? 'local' : 'edge';
    },
    create: (...args) => Effect.flatMap(select, (backend) => backend.create(...args)),
    exec: (...args) => Effect.flatMap(select, (backend) => backend.exec(...args)),
    readFileBytes: (...args) => Effect.flatMap(select, (backend) => backend.readFileBytes(...args)),
    writeFile: (...args) => Effect.flatMap(select, (backend) => backend.writeFile(...args)),
    listFiles: (...args) => Effect.flatMap(select, (backend) => backend.listFiles(...args)),
    publish: (...args) =>
      Effect.flatMap(select, (backend) =>
        backend.publish
          ? backend.publish(...args)
          : Effect.fail(new SandboxService.SandboxError({ message: NO_PUBLISH })),
      ),
  };
};

const envPreference = (): Settings.Backend | undefined => {
  const value = typeof process === 'undefined' ? undefined : process.env?.[SANDBOX_BACKEND_ENV];
  return value === 'local' || value === 'edge' ? value : undefined;
};

const unavailable = (message: string): SandboxService.Backend => {
  const fail = () => Effect.fail(new SandboxService.SandboxError({ message }));
  return { kind: 'local', create: fail, exec: fail, readFileBytes: fail, writeFile: fail, listFiles: fail };
};
