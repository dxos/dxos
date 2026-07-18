//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import type { Context as DxosContext } from '@dxos/context';

/**
 * Invokes operations deployed to a remote runtime (EDGE).
 *
 * Interface only: the EDGE implementation is `EdgeOperationInvoker` in
 * `@dxos/edge-compute`. Supersedes the former `RemoteFunctionExecutionService`.
 */
export interface Invoker {
  /**
   * Invoke a deployed operation by its deployment id.
   */
  invoke<I, O>(ctx: DxosContext, deployedId: string, input: I): Effect.Effect<O>;
}

export class Service extends Context.Tag('@dxos/compute-runtime/RemoteOperationInvoker')<Service, Invoker>() {}

/**
 * No-op remote invoker for local-only deployments. Dies if a remote
 * invocation is attempted, since no remote runtime is configured.
 */
export const layerNoop: Layer.Layer<Service> = Layer.succeed(Service, {
  invoke: () => Effect.die(new Error('No remote operation invoker configured')),
});
