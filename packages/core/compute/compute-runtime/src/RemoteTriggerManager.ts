//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Atom from 'effect/unstable/reactivity/Atom';
import * as Registry from 'effect/unstable/reactivity/AtomRegistry';

import * as Trigger from '@dxos/compute/Trigger';

/**
 * Read-only view + invocation surface for triggers registered on a remote
 * runtime (EDGE).
 *
 * Interface only: the EDGE implementation is `EdgeTriggerManager` in
 * `@dxos/edge-compute`.
 */
export interface Manager {
  readonly triggers: Atom.Atom<readonly Trigger.State[]>;
  readonly invokeTrigger: (options: Trigger.InvokeOptions) => Effect.Effect<void>;
}

export class Service extends Context.Service<Service, Manager>()('@dxos/compute-runtime/RemoteTriggerManager') {}

/**
 * Empty remote trigger manager for local-only deployments.
 */
export const layerNoop: Layer.Layer<Service, never, Registry.AtomRegistry> = Layer.effect(
  Service,
  Effect.gen(function* () {
    const registry = yield* Registry.AtomRegistry;
    const triggers = Atom.make<readonly Trigger.State[]>([]);
    registry.mount(triggers);
    return {
      triggers,
      invokeTrigger: () => Effect.die(new Error('No remote trigger manager configured')),
    } satisfies Manager;
  }),
);
