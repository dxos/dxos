//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Stream from 'effect/Stream';
import * as RpcClient from 'effect/unstable/rpc/RpcClient';
import type * as Worker from 'effect/unstable/workers/Worker';

import { Obj } from '@dxos/echo';

import * as Sandbox from './Sandbox.ts';
import { type Outbound, type Outcome, SandboxProtocol } from './WorkerSandboxProtocol.ts';

/** A spawned worker, and the one thing the host needs from it beyond the message channel. */
export type WorkerHandle = {
  /** Passed to the platform layer as the thing to talk to. */
  readonly worker: any;
  /** Stops the thread outright, whatever it is running. */
  readonly terminate: () => void;
};

export type WorkerSandboxOptions = {
  /**
   * Module the worker runs. Defaults to the entry beside this one, resolved with the extension
   * this module itself was loaded under, so it works both from source and from a build.
   */
  readonly entry?: URL;
  /** Spawns the worker, for a runtime whose worker is not `node:worker_threads`. */
  readonly spawn?: (entry: URL) => Promise<WorkerHandle>;
};

/**
 * Runs the model's code in a worker thread, over an RPC channel back to this process.
 *
 * This is the implementation `Sandbox` exists to accept. Two things follow from the code being on
 * another thread, and both are the point:
 *
 * - A timeout KILLS it. The host terminates the thread, so an evaluation that outran its budget
 *   stops rather than carrying on with its bindings the way the in-process one does — including
 *   the synchronous loop that no in-process timeout can interrupt at all.
 * - A long evaluation cannot stall the turn's thread, because it was never on it.
 *
 * What it costs is that bindings are no longer live values. Every argument and result crosses by
 * structured clone, so a binding must be a function over plain data: live objects are replaced by
 * a snapshot on the way out and resolved back by id on the way in, and a function passed as an
 * ARGUMENT cannot cross at all (the host would have to call back into the worker from inside a
 * synchronous API, which cannot be made to work). That is why the dialect's `update` takes a patch
 * as well as a mutator — the patch is the form that survives this boundary.
 *
 * It is not a security boundary either: a worker shares the host's permissions and can reach the
 * network and the filesystem. It bounds TIME and isolates CRASHES, not authority.
 */
export const make = (options: WorkerSandboxOptions = {}): Sandbox.Sandbox => ({
  evaluate: ({ code, bindings, timeout }) =>
    Effect.gen(function* () {
      const scope = collect(bindings);
      const entry = options.entry ?? defaultEntry();

      const handle = yield* Effect.acquireRelease(
        Effect.promise(() => (options.spawn ?? spawnNodeWorker)(entry)),
        ({ terminate }) => Effect.sync(terminate),
      );

      // Built into this evaluation's scope rather than provided around the call: the protocol has
      // to outlive `make`, or the channel closes the moment the client exists.
      const protocol = yield* Layer.build(
        // One worker, but its requests must interleave: `evaluate` stays open for the whole
        // evaluation, and every `resolve` answering it has to travel while it does.
        RpcClient.layerProtocolWorker({ size: 1, concurrency: Number.MAX_SAFE_INTEGER }).pipe(
          Layer.provide(platformLayer(handle)),
        ),
      );
      const client = yield* RpcClient.make(SandboxProtocol, { disableTracing: true }).pipe(Effect.provide(protocol));

      // Registered after the protocol so it runs BEFORE the protocol's own finalizer: closing a
      // channel politely means waiting for an answer, and a worker wedged in a synchronous loop
      // never gives one. Killing it first makes the close fail fast instead of hanging. Terminating
      // twice is harmless, which is what makes this safe alongside the acquire above.
      yield* Effect.addFinalizer(() => Effect.sync(handle.terminate));

      // Live objects the host has handed out this evaluation, so one coming back — as the argument
      // to `add`, `remove` or `update` — is the object itself again rather than a copy of it.
      const live = new Map<string, unknown>();
      // Built through a function returning the union, so the initial value does not narrow what
      // the stream is allowed to assign to it below.
      let outcome: Outbound = failure('The worker stopped without reporting a result.');

      const evaluation = client.evaluate({ code, bindings: scope.paths }).pipe(
        Stream.runForEach((message) =>
          message._tag === 'Call'
            ? answer(scope, live, message).pipe(Effect.flatMap((result) => client.resolve(result)))
            : Effect.sync(() => {
                outcome = message;
              }),
        ),
      );

      const bounded =
        timeout === undefined
          ? evaluation
          : evaluation.pipe(
              Effect.timeoutOrElse({
                duration: timeout,
                orElse: () =>
                  Effect.sync(() => {
                    // The whole reason for this sandbox: the thread dies, so the code on it does too.
                    handle.terminate();
                  }).pipe(
                    Effect.flatMap(() =>
                      Effect.fail(
                        new Sandbox.EvaluationError({
                          message: `Evaluation did not finish within ${Duration.format(Duration.fromInputUnsafe(timeout))}; the worker was killed.`,
                        }),
                      ),
                    ),
                  ),
              }),
            );

      yield* bounded;

      if (outcome._tag === 'Failed') {
        return yield* Effect.fail(new Sandbox.EvaluationError({ message: outcome.message }));
      }
      return outcome._tag === 'Done' ? outcome.value : undefined;
    }).pipe(
      Effect.scoped,
      // One place to turn everything that can go wrong — spawning, the channel, the model's own
      // code — into the output the model reads and writes different code against.
      Effect.catch((error) =>
        Effect.fail(
          error instanceof Sandbox.EvaluationError
            ? error
            : new Sandbox.EvaluationError({ message: `The worker failed: ${describe(error)}` }),
        ),
      ),
    ),
});

/** The outcome stands in until the worker reports one, typed as the union so it can be replaced. */
const failure = (message: string): Outbound => ({ _tag: 'Failed', message });

/** Runs one binding call on the host and packages whatever it did as the worker's answer. */
const answer = (
  scope: Scope,
  live: Map<string, unknown>,
  { id, path, args }: { readonly id: number; readonly path: readonly string[]; readonly args: readonly unknown[] },
): Effect.Effect<{ id: number; outcome: Outcome }> => {
  const binding = scope.functions.get(path.join('\u0000'));
  if (binding === undefined) {
    return Effect.succeed({ id, outcome: { _tag: 'Error' as const, message: `Unknown binding: ${path.join('.')}` } });
  }
  return Effect.tryPromise({
    try: async () => encode(await binding(...args.map((arg) => decode(arg, live))), live),
    catch: (error) => error,
  }).pipe(
    Effect.match({
      onSuccess: (value: unknown) => ({ id, outcome: { _tag: 'Ok' as const, value } }),
      onFailure: (error: unknown) => ({ id, outcome: { _tag: 'Error' as const, message: describe(error) } }),
    }),
  );
};

/**
 * Replaces every live object with a snapshot, remembering it so the same object can be recovered
 * when the worker names it again. Anything structured clone would reject reaches the worker as
 * `undefined` rather than failing the call, since the model can act on a missing field but not on
 * a dead channel.
 */
const encode = (value: unknown, live: Map<string, unknown>): unknown => {
  if (Obj.isObject(value)) {
    live.set(value.id, value);
    return Obj.toJSON(value);
  }
  if (Array.isArray(value)) {
    return value.map((entry) => encode(entry, live));
  }
  if (isPlain(value)) {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, encode(entry, live)]));
  }
  return typeof value === 'function' || typeof value === 'symbol' ? undefined : value;
};

/** The inverse: a snapshot naming an object the host handed out becomes that object again. */
const decode = (value: unknown, live: Map<string, unknown>): unknown => {
  if (Array.isArray(value)) {
    return value.map((entry) => decode(entry, live));
  }
  if (isPlain(value)) {
    const id = (value as { id?: unknown }).id;
    if (typeof id === 'string' && live.has(id)) {
      return live.get(id);
    }
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, decode(entry, live)]));
  }
  return value;
};

const isPlain = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' &&
  value !== null &&
  (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);

/** The dialect's bindings, flattened to the paths the worker rebuilds its scope from. */
type Scope = {
  readonly paths: readonly (readonly string[])[];
  readonly functions: Map<string, (...args: any[]) => any>;
};

const collect = (bindings: Record<string, unknown>): Scope => {
  const paths: (readonly string[])[] = [];
  const functions = new Map<string, (...args: any[]) => any>();
  const walk = (value: unknown, path: readonly string[]): void => {
    if (typeof value === 'function') {
      paths.push(path);
      functions.set(path.join('\u0000'), value as (...args: any[]) => any);
    } else if (isPlain(value)) {
      // A group like `ops` is a plain object of functions, so it is walked rather than cloned; a
      // non-function leaf is dropped, because only a call can cross this boundary.
      for (const [key, entry] of Object.entries(value)) {
        walk(entry, [...path, key]);
      }
    }
  };
  for (const [key, value] of Object.entries(bindings)) {
    walk(value, [key]);
  }
  return { paths, functions };
};

const describe = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message.length > 0 ? error.message : String(error);
  }
  const text = String(error);
  return text.length > 0 && text !== '[object Object]' ? text : 'Unknown failure.';
};

/**
 * The entry beside this module, under the extension this module was itself loaded under:
 * `WorkerSandboxEntry.ts` next to the source, `WorkerSandboxEntry.mjs` next to the bundle, which
 * is why the build gives it an output of its own. A worker is started from a real file, so there
 * is nothing the bundler that resolved this import can do for it.
 */
const defaultEntry = (): URL => {
  const extension = /\.[^./]+$/.exec(import.meta.url)?.[0] ?? '.js';
  return new URL(`./WorkerSandboxEntry${extension}`, import.meta.url);
};

/**
 * Imported here rather than at the top of the module so that loading this file does not pull
 * `node:worker_threads` into a browser bundle; a browser deployment passes its own `spawn`.
 */
const spawnNodeWorker = async (entry: URL): Promise<WorkerHandle> => {
  const { Worker } = await import('node:worker_threads');
  const instance = new Worker(entry);
  // Nothing is waiting on this thread at exit: the host terminates it, and until then the
  // evaluation it is running is what holds the turn open.
  instance.unref();
  return { worker: instance, terminate: () => void instance.terminate() };
};

const platformLayer = (handle: WorkerHandle): Layer.Layer<Worker.WorkerPlatform | Worker.Spawner> =>
  Layer.unwrap(
    Effect.promise(async () => {
      const NodeWorker = await import('@effect/platform-node/NodeWorker');
      return NodeWorker.layer(() => handle.worker);
    }),
  );

/** Installs {@link make} as the ambient sandbox. */
export const layer = (options: WorkerSandboxOptions = {}): Layer.Layer<Sandbox.Service> =>
  Layer.succeed(Sandbox.Service, make(options));
