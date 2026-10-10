//
// Copyright 2026 DXOS.org
//
// @import-as-namespace
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as RpcClient from 'effect/rpc/RpcClient';

import * as Protocol from './Protocol.ts';

/** A pool of parsing workers, addressed through Effect RPC. */

const workerUrl = new URL('./main.ts', import.meta.url);

// Bun spawns web workers, Node spawns worker threads; the worker source is the same file.
const platformLayer = Layer.unwrap(
  Effect.promise(async () => {
    if (typeof globalThis.Bun !== 'undefined') {
      const BunWorker = await import('@effect/platform-bun/BunWorker');
      return BunWorker.layer(() => new globalThis.Worker(workerUrl.href, { type: 'module' }));
    }
    const NodeWorker = await import('@effect/platform-node/NodeWorker');
    const { Worker } = await import('node:worker_threads');
    return NodeWorker.layer(() => new Worker(workerUrl));
  }),
);

/**
 * Opens `size` workers for the enclosing scope. The protocol layer is built into the *ambient*
 * scope rather than provided to the `make` effect, which would close the pool as soon as the
 * client was constructed.
 */
export const make = (size: number) =>
  Effect.gen(function* () {
    const context = yield* Layer.build(RpcClient.layerProtocolWorker({ size }).pipe(Layer.provide(platformLayer)));
    return yield* Effect.provideContext(RpcClient.make(Protocol.Rpcs), context);
  });

/** The RPC client the pool hands out. */
export type Client = Effect.Success<ReturnType<typeof make>>;
