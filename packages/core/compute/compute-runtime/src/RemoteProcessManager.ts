//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { Atom, Registry } from '@effect-atom/atom';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { Process } from '@dxos/compute';

/**
 * Read-only view of processes running on a remote runtime (EDGE).
 *
 * Interface only: the EDGE implementation is `EdgeProcessManager` in
 * `@dxos/edge-compute`.
 */
export interface Manager {
  readonly processTree: Effect.Effect<readonly Process.Info[]>;
  readonly processTreeAtom: Atom.Atom<readonly Process.Info[]>;
}

export class Service extends Context.Tag('@dxos/compute-runtime/RemoteProcessManager')<Service, Manager>() {}

/**
 * Empty remote manager for local-only deployments.
 */
export const layerNoop: Layer.Layer<Service, never, Registry.AtomRegistry> = Layer.effect(
  Service,
  Effect.gen(function* () {
    const registry = yield* Registry.AtomRegistry;
    const processTreeAtom = Atom.make<readonly Process.Info[]>([]);
    registry.mount(processTreeAtom);
    return {
      processTree: Effect.sync(() => registry.get(processTreeAtom)),
      processTreeAtom,
    } satisfies Manager;
  }),
);
