//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import type { Context as DxosContext } from '@dxos/context';
import type { SpaceId } from '@dxos/keys';

/**
 * Invokes operations deployed to a remote runtime (EDGE).
 *
 * Interface only: the EDGE implementation is `EdgeOperationInvoker` in
 * `@dxos/edge-compute`. Supersedes the former `RemoteFunctionExecutionService`.
 */
export interface Invoker {
  /**
   * Invoke a deployed operation by its deployment id: a deployed function's id, or `dxn:<key>` for an operation
   * the runtime hosts. `spaceId` scopes this call, overriding any space the invoker was built for. Input and
   * output are the wire (encoded) form; the caller holds the schemas that decode them.
   */
  invoke(ctx: DxosContext, deployedId: string, input: unknown, options?: InvokeOptions): Effect.Effect<unknown>;
}

export type InvokeOptions = { readonly spaceId?: SpaceId };

export class Service extends Context.Service<Service, Invoker>()('@dxos/compute-runtime/RemoteOperationInvoker') {}

/**
 * No-op remote invoker for local-only deployments. Dies if a remote
 * invocation is attempted, since no remote runtime is configured.
 */
export const layerNoop: Layer.Layer<Service> = Layer.succeed(Service, {
  invoke: () => Effect.die(new Error('No remote operation invoker configured')),
});
