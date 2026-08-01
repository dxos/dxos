//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { Atom, Registry } from '@effect-atom/atom';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { type Client } from '@dxos/client';
import { type Process } from '@dxos/compute';
import { RemoteProcessManager } from '@dxos/compute-runtime';

/**
 * EDGE implementation of {@link RemoteProcessManager.Service}.
 *
 * The EDGE worker exposes no process-tree endpoint yet (see Decision D3), so
 * this currently returns an empty tree. Once an endpoint lands, poll it into
 * `processTreeAtom` here.
 */
const make = (): Layer.Layer<RemoteProcessManager.Service, never, Registry.AtomRegistry> =>
  Layer.effect(
    RemoteProcessManager.Service,
    Effect.gen(function* () {
      const registry = yield* Registry.AtomRegistry;
      // TODO(edge): Populate from an EDGE process-tree endpoint once available.
      const processTreeAtom = Atom.make<readonly Process.Info[]>([]);
      registry.mount(processTreeAtom);
      return {
        processTree: Effect.sync(() => registry.get(processTreeAtom)),
        processTreeAtom,
      } satisfies RemoteProcessManager.Manager;
    }),
  );

/**
 * Build from a `Client`. Currently ignores the client until an EDGE
 * process-tree endpoint exists.
 */
export const fromClient = (_client: Client): Layer.Layer<RemoteProcessManager.Service, never, Registry.AtomRegistry> =>
  make();

/**
 * Empty EDGE process manager (no endpoint yet).
 */
export const layer: Layer.Layer<RemoteProcessManager.Service, never, Registry.AtomRegistry> = make();
