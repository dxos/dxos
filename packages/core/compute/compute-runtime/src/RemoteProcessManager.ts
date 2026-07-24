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
 * Cancel target for a remote (EDGE) run. Addressed by `trigger` (the stable cross-boundary key) in
 * `space`; `pid` is carried for correlation/telemetry only. Ids are strings to keep this interface
 * free of `@dxos/keys` value imports.
 */
export type RemoteCancelTarget = {
  readonly space: string;
  readonly trigger: string;
  readonly pid?: string;
};

/**
 * Read-only view of processes running on a remote runtime (EDGE), plus a cancel control.
 *
 * Interface only: the EDGE implementation is `EdgeProcessManager` in
 * `@dxos/edge-compute`.
 */
export interface Manager {
  readonly processTree: Effect.Effect<readonly Process.Info[]>;
  readonly processTreeAtom: Atom.Atom<readonly Process.Info[]>;

  /**
   * Cancels the current run of a remote (edge) trigger — its in-flight execution and `runAgain`
   * continuation chain; the trigger itself stays enabled so its schedule keeps firing. Optional:
   * absent in {@link layerNoop} (local-only deployments have no remote runtime to cancel on).
   */
  readonly cancel?: (target: RemoteCancelTarget) => Effect.Effect<void>;
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
