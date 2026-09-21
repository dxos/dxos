//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Context from 'effect/Context';
import * as Deferred from 'effect/Deferred';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import type * as WorkerThreads from 'node:worker_threads';

import { type ClientServicesHandlers, Rpc, makeClientServicesHandlers } from '@dxos/client-protocol';
import { Database, JsonSchema, Type } from '@dxos/echo';

import * as Sandbox from './Sandbox.ts';
import { SandboxHostRpcs, type SandboxInit, SandboxRpcs } from './WorkerSandboxProtocol.ts';

/**
 * A spawned worker: the host's end of its channel, and the one other thing the host needs.
 *
 * The spawner owns the channel because only it knows the platform's own port type; the host just
 * serves on whichever end it is handed.
 */
export type WorkerHandle = {
  readonly port: MessagePort;
  /**
   * Settles when the thread dies, with why if it died badly.
   *
   * A worker that fails before it can report — a bad entry module, a crash during setup — would
   * otherwise leave the host waiting for its whole budget and then blame a timeout it never hit.
   */
  readonly stopped: Promise<string | undefined>;
  /** Stops the thread outright, whatever it is running. */
  readonly terminate: () => void;
};

/**
 * What the worker's own ECHO client connects to: the host services a tab would connect to, and the
 * space to open. Supplied by whoever wires the sandbox, since `Database` publishes neither the
 * space key nor the root url — a sandbox has no business reconstructing them.
 */
export type EchoAccess = Pick<ClientServicesHandlers, 'DataService' | 'QueryService'> & {
  readonly space: { readonly spaceId: string; readonly spaceKey: string; readonly rootUrl: string };
};

export type WorkerSandboxOptions = {
  /**
   * Host-side ECHO services, resolved per evaluation so the served set follows the host lifecycle.
   */
  readonly echo: () => EchoAccess;
  /**
   * Module the worker runs. Defaults to the entry beside this one, under the extension this module
   * was itself loaded under — a worker starts from a real file, not through a bundler.
   */
  readonly entry?: URL;
  /** Spawns the worker, for a runtime whose worker is not `node:worker_threads`. */
  readonly spawn?: (entry: URL, init: SandboxInit) => Promise<WorkerHandle>;
};

/**
 * Runs the model's code on a worker thread, against its own ECHO client.
 *
 * The worker is not a special kind of peer: it connects to the host's `ClientServices` exactly as a
 * tab does, so the dialect's bindings are built THERE and the code sees live objects, real queries
 * and a working `Obj.update`. Only what that boundary has no service for is added to the same port
 * — printing, invoking a skill's operation, and reporting the result.
 *
 * What this buys over {@link Sandbox.inProcess} is that a timeout KILLS the evaluation: the host
 * terminates the thread, so code that outran its budget stops rather than carrying on with its
 * bindings, including a synchronous loop no in-process timeout can interrupt. A long evaluation
 * also cannot stall the turn's thread, because it was never on it.
 *
 * It is NOT a security boundary: a worker shares the host's permissions and can reach the network
 * and the filesystem. It bounds time and isolates crashes, not authority.
 */
export const make = (options: WorkerSandboxOptions): Sandbox.Sandbox => ({
  evaluate: ({ code, dialect, context, timeout }) =>
    Effect.gen(function* () {
      const { db } = Context.get(context.runtime, Database.Service);
      const echo = options.echo();
      const init: SandboxInit = {
        code,
        dialect: dialect.name,
        space: echo.space,
        types: registrySnapshot(db),
        operations: context.operations.map((operation) => ({
          key: String(operation.definition?.meta.key ?? operation.name),
          name: operation.name,
          description: operation.description,
          parameters: operation.parameters,
        })),
      };

      const settled = yield* Deferred.make<unknown, Sandbox.EvaluationError>();

      const handle = yield* Effect.acquireRelease(
        Effect.promise(() => (options.spawn ?? spawnNodeWorker)(options.entry ?? defaultEntry(), init)),
        ({ terminate }) => Effect.sync(terminate),
      );

      const server = Rpc.serve(
        handle.port,
        SandboxRpcs,
        Layer.merge(
          makeClientServicesHandlers({ services: () => echo }),
          SandboxHostRpcs.toLayer({
            'Sandbox.print': ({ values }) => Effect.sync(() => context.print(...values)),
            'Sandbox.invokeOperation': ({ key, input }) => invokeOperation(context, key, input),
            'Sandbox.complete': ({ value, failure }) =>
              Deferred.complete(
                settled,
                failure === null
                  ? Effect.succeed(value)
                  : Effect.fail(new Sandbox.EvaluationError({ message: failure })),
              ).pipe(Effect.asVoid),
          }),
        ),
        // Both ends must agree on the timing middleware; neither applies it, since this connection
        // is internal to one evaluation and has no dashboard reading it.
        { disableTracing: true, concurrency: 'unbounded', timing: false },
      );
      // The worker dying is the other way every stage of this ends, including the one BEFORE the
      // channel exists: `open()` waits for a handshake a dead worker will never send, so a failed
      // spawn — a missing entry module, a crash while loading it — would otherwise hang there
      // rather than be reported.
      //
      // `raceFirst`, not `race`: this branch always FAILS, and `race` waits for a SUCCESS, so it
      // would discard the very signal being watched for and wait out the other side regardless.
      const stopped = Effect.promise(() => handle.stopped).pipe(
        Effect.flatMap((reason) =>
          Effect.fail(
            new Sandbox.EvaluationError({
              message: `The worker stopped without reporting a result${reason === undefined ? '' : `: ${reason}`}.`,
            }),
          ),
        ),
      );

      // Registered before the open rather than paired with it, so the server is closed even when
      // the open loses that race.
      yield* Effect.addFinalizer(() => Effect.promise(() => server.close()));
      yield* Effect.raceFirst(
        Effect.promise(() => server.open()),
        stopped,
      );

      const evaluation = Effect.raceFirst(Deferred.await(settled), stopped);
      return yield* timeout === undefined
        ? evaluation
        : evaluation.pipe(
            Effect.timeoutOrElse({
              duration: timeout,
              orElse: () =>
                Effect.sync(handle.terminate).pipe(
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
    }).pipe(
      Effect.scoped,
      Effect.catch((error) =>
        Effect.fail(
          error instanceof Sandbox.EvaluationError
            ? error
            : new Sandbox.EvaluationError({ message: `The worker failed: ${describe(error)}` }),
        ),
      ),
    ),
});

/** Runs one operation here, where its handler and the conversation it belongs to live. */
const invokeOperation = (
  context: {
    readonly operations: readonly {
      readonly name: string;
      readonly definition?: { meta: { key: unknown } };
      readonly invoke: (input: unknown) => Effect.Effect<unknown>;
    }[];
  },
  key: string,
  input: unknown,
) => {
  const operation = context.operations.find(
    (candidate) => String(candidate.definition?.meta.key ?? candidate.name) === key,
  );
  if (operation === undefined) {
    return Effect.succeed({ _tag: 'Error' as const, message: `Unknown operation: ${key}` });
  }
  return operation.invoke(input).pipe(
    Effect.match({
      onSuccess: (value: unknown) => ({ _tag: 'Ok' as const, value }),
      onFailure: (error: unknown) => ({ _tag: 'Error' as const, message: describe(error) }),
    }),
  );
};

/**
 * Every registered type as schema rather than as the class the worker cannot receive, which is the
 * one thing the client-services boundary carries no service for.
 */
const registrySnapshot = (db: Database.Database): SandboxInit['types'] =>
  db.registry.list().flatMap((entity) => {
    if (!Type.isType(entity)) {
      return [];
    }
    const typename = Type.getTypename(entity);
    const version = Type.getVersion(entity);
    return typename === undefined || version === undefined
      ? []
      : [{ typename, version, jsonSchema: JsonSchema.toJsonSchema(entity) }];
  });

const describe = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message.length > 0 ? error.message : String(error);
  }
  const text = String(error);
  return text.length > 0 && text !== '[object Object]' ? text : 'Unknown failure.';
};

const defaultEntry = (): URL => {
  const extension = /\.[^./]+$/.exec(import.meta.url)?.[0] ?? '.js';
  return new URL(`./WorkerSandboxEntry${extension}`, import.meta.url);
};

/**
 * Imported here rather than at the top of the module so that loading this file does not pull
 * `node:worker_threads` into a browser bundle; a browser deployment passes its own `spawn`.
 */
const spawnNodeWorker = async (entry: URL, init: SandboxInit): Promise<WorkerHandle> => {
  const { MessageChannel, Worker } = await import('node:worker_threads');
  const channel = new MessageChannel();
  const instance = new Worker(entry, {
    workerData: { init, port: channel.port2 },
    transferList: [channel.port2],
  });

  let announce: (reason: string | undefined) => void = () => {};
  const stopped = new Promise<string | undefined>((resolve) => {
    announce = resolve;
  });
  instance.on('error', (error) => announce(describe(error)));
  instance.on('exit', (code) => announce(code === 0 ? undefined : `it exited with code ${code}`));
  // Nothing waits on this thread at exit: the host terminates it, and until then the evaluation it
  // is running is what holds the turn open.
  instance.unref();
  return { port: toMessagePort(channel.port1), stopped, terminate: () => void instance.terminate() };
};

/**
 * The one place the two type worlds meet.
 *
 * `node:worker_threads` and the DOM describe the SAME runtime object — in Node the global
 * `MessageChannel` is this one — but their types are irreconcilable: DOM `postMessage` takes
 * `Transferable[]`, which includes things (`AudioData`) node's `TransferListItem` has never heard
 * of, so neither is structurally assignable to the other. The rpc server is typed against the DOM
 * port, node's `transferList` against node's, and a port cannot be transferred any other way.
 */
const toMessagePort = (port: WorkerThreads.MessagePort): MessagePort => port as unknown as MessagePort;

/** Installs {@link make} as the ambient sandbox. */
export const layer = (options: WorkerSandboxOptions): Layer.Layer<Sandbox.Service> =>
  Layer.succeed(Sandbox.Service, make(options));
