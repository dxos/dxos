//
// Copyright 2026 DXOS.org
//

import * as NodeWorkerRunner from '@effect/platform-node/NodeWorkerRunner';
import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Queue from 'effect/Queue';
import * as Stream from 'effect/Stream';
import * as RpcServer from 'effect/unstable/rpc/RpcServer';

import { type Outbound, SandboxProtocol } from './WorkerSandboxProtocol.ts';

/**
 * The other end of {@link SandboxProtocol}, running inside the worker.
 *
 * This module is loaded by a fresh worker per evaluation, so it holds no state worth clearing and
 * is disposed of by the host terminating the thread. It deliberately imports NOTHING from `@dxos`:
 * the host starts it straight from source, which Node does by stripping types, and that only works
 * while every import on this path is plain JavaScript or erasable TypeScript.
 */

// eslint-disable-next-line @typescript-eslint/no-implied-eval
const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;

/** Replies the host owes us, keyed by the id we sent the call under. */
type Pending = { resolve: (value: unknown) => void; reject: (error: Error) => void };

const handlers = Effect.gen(function* () {
  const pending = new Map<number, Pending>();
  let nextId = 0;

  return {
    evaluate: ({ code, bindings }: { readonly code: string; readonly bindings: readonly (readonly string[])[] }) =>
      Stream.unwrap(
        Effect.gen(function* () {
          const outbound = yield* Queue.unbounded<Outbound, Cause.Done>();

          // The model's code is ordinary async JavaScript, so a binding is a function returning a
          // promise the host settles — not an effect. The RPC server keeps running on this thread
          // while that promise is outstanding, which is what lets `resolve` arrive and land.
          const stub =
            (path: readonly string[]) =>
            (...args: unknown[]) =>
              new Promise((resolve, reject) => {
                const id = nextId++;
                pending.set(id, { resolve, reject });
                Queue.offerUnsafe(outbound, { _tag: 'Call', id, path, args });
              });

          const scope: Record<string, any> = {};
          for (const path of bindings) {
            let target = scope;
            for (const segment of path.slice(0, -1)) {
              target = target[segment] ??= {};
            }
            target[path[path.length - 1]] = stub(path);
          }

          const names = Object.keys(scope);
          yield* Effect.forkScoped(
            Effect.tryPromise({
              try: () => new AsyncFunction(...names, `'use strict';\n${code}`)(...names.map((name) => scope[name])),
              catch: (error) => error,
            }).pipe(
              Effect.match({
                onSuccess: (value: unknown) => ({ _tag: 'Done', value }) as const,
                onFailure: (error: unknown) => ({ _tag: 'Failed', message: describe(error) }) as const,
              }),
              Effect.flatMap((last) => Queue.offer(outbound, last)),
              // Ends the stream: the host has its answer and the thread is about to be terminated.
              Effect.flatMap(() => Queue.end(outbound)),
            ),
          );

          return Stream.fromQueue(outbound);
        }),
      ).pipe(Stream.scoped),

    resolve: ({ id, outcome }: { readonly id: number; readonly outcome: any }) =>
      Effect.sync(() => {
        const waiting = pending.get(id);
        if (waiting === undefined) {
          return;
        }
        pending.delete(id);
        if (outcome._tag === 'Ok') {
          waiting.resolve(outcome.value);
        } else {
          waiting.reject(new Error(outcome.message));
        }
      }),
  };
});

/** Reads a message out of whatever the model's code threw, which is not necessarily an `Error`. */
const describe = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message.length > 0 ? error.message : String(error);
  }
  const text = String(error);
  return text.length > 0 && text !== '[object Object]' ? text : 'Unknown failure.';
};

const main = RpcServer.layer(SandboxProtocol).pipe(
  Layer.provide(SandboxProtocol.toLayer(handlers)),
  Layer.provide(RpcServer.layerProtocolWorkerRunner),
  Layer.provide(NodeWorkerRunner.layer),
);

Effect.runFork(Layer.launch(main));
