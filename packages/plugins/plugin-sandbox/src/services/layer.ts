//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import type * as CapabilityManager from '@dxos/app-framework/CapabilityManager';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';

import { getLocalSandboxBackend } from '#local-backend';

import * as RepositoryService from '../types/RepositoryService.ts';
import * as SandboxCapabilities from '../types/SandboxCapabilities.ts';
import * as SandboxService from '../types/SandboxService.ts';
import * as Settings from '../types/Settings.ts';
import { makeEdgeBackend } from './edge-backend.ts';
import { makeEdgeRepositoryBackend } from './repository-backend.ts';
import { type EdgeContext } from './sandbox-url.ts';

/** Environment variable selecting the backend under Node or Bun; it overrides the plugin setting. */
export const SANDBOX_BACKEND_ENV = 'DX_SANDBOX_BACKEND';

/** Sandboxes on EDGE, authenticated as the client's identity. */
export const layerEdge: Layer.Layer<SandboxService.Service, never, Capability.Service> = Layer.effect(
  SandboxService.Service,
  Effect.gen(function* () {
    return makeEdgeBackend(edgeContext(yield* Capability.Service));
  }),
);

/** Repositories live on EDGE whichever backend runs the sandboxes: they are what outlives them. */
export const layerRepository: Layer.Layer<RepositoryService.Service, never, Capability.Service> = Layer.effect(
  RepositoryService.Service,
  Effect.gen(function* () {
    return makeEdgeRepositoryBackend(edgeContext(yield* Capability.Service));
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
export const layer: Layer.Layer<SandboxService.Service, never, Capability.Service> = Layer.effect(
  SandboxService.Service,
  Effect.gen(function* () {
    return selecting({
      edge: makeEdgeBackend(edgeContext(yield* Capability.Service)),
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
export const layerFromCapabilities: Layer.Layer<SandboxService.Service, never, Capability.Service> = Layer.effect(
  SandboxService.Service,
  Effect.gen(function* () {
    const capabilities = yield* Capability.Service;
    const edge = makeEdgeBackend(edgeContext(capabilities));
    const setting = (): Settings.Backend | undefined => {
      const [settings] = capabilities.getAll(SandboxCapabilities.Settings);
      const [registry] = capabilities.getAll(Capabilities.AtomRegistry);
      return settings && registry ? registry.get(settings).backend : undefined;
    };
    return selecting({
      edge,
      preference: () => envPreference() ?? setting() ?? Settings.defaultBackend(),
      launcher: () => capabilities.getAll(SandboxCapabilities.LocalLauncher)[0],
    });
  }),
);

const NO_LOCAL_RUNTIME = 'Local sandboxes need the desktop app, or Node or Bun.';

const NO_PUBLISH = 'Publishing files needs a local sandbox in the desktop app.';

const NO_REPOSITORIES = 'Repositories can be attached only to EDGE sandboxes.';

const NO_TERMINAL = 'An interactive shell needs an EDGE sandbox.';

/** Reads the client's config and identity per call: both arrive once the client has initialized. */
const edgeContext = (capabilities: CapabilityManager.CapabilityManager) => (): EdgeContext => {
  const [config] = capabilities.getAll(ClientCapabilities.Config);
  const [identity] = capabilities.getAll(ClientCapabilities.IdentityService);
  if (!config || !identity) {
    throw new Error(`Sandbox EDGE backend: client ${config ? 'identity' : 'config'} is not available yet.`);
  }
  return { config, identity };
};

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
    exposePort: (...args) => Effect.flatMap(select, (backend) => backend.exposePort(...args)),
    setRepositories: (...args) =>
      Effect.flatMap(select, (backend) =>
        backend.setRepositories
          ? backend.setRepositories(...args)
          : Effect.fail(new SandboxService.SandboxError({ message: NO_REPOSITORIES })),
      ),
    publish: (...args) =>
      Effect.flatMap(select, (backend) =>
        backend.publish
          ? backend.publish(...args)
          : Effect.fail(new SandboxService.SandboxError({ message: NO_PUBLISH })),
      ),
    terminal: (...args) =>
      Effect.flatMap(select, (backend) =>
        backend.terminal
          ? backend.terminal(...args)
          : Effect.fail(new SandboxService.SandboxError({ message: NO_TERMINAL })),
      ),
  };
};

const envPreference = (): Settings.Backend | undefined => {
  const value = typeof process === 'undefined' ? undefined : process.env?.[SANDBOX_BACKEND_ENV];
  return value === 'local' || value === 'edge' ? value : undefined;
};

const unavailable = (message: string): SandboxService.Backend => {
  const fail = () => Effect.fail(new SandboxService.SandboxError({ message }));
  return {
    kind: 'local',
    create: fail,
    exec: fail,
    readFileBytes: fail,
    writeFile: fail,
    listFiles: fail,
    exposePort: fail,
  };
};
