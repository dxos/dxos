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
import * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import { Database, JsonSchema, Type } from '@dxos/echo';
import type { EchoClient } from '@dxos/echo-client';
import { DXN, PublicKey, type SpaceId, URI } from '@dxos/keys';
import { log } from '@dxos/log';

import { resolveTypeOf } from './dialect-effect.ts';
import type { BindingsContext } from './Dialect.ts';
import { toRefs } from './refs.ts';
import * as Sandbox from './Sandbox.ts';
import * as Wire from './Wire.ts';
import { SandboxHostRpcs, type SandboxInit, SandboxRpcs, type SandboxType } from './WorkerSandboxProtocol.ts';

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
  /** For a worker that is a security boundary: what of the host's services it is served instead of all of them. */
  readonly limit?: (echo: EchoAccess) => EchoAccess;
};

/** What the worker's own ECHO client connects to: the host services a tab would connect to. */
export type EchoAccess = Pick<ClientServicesHandlers, 'DataService' | 'QueryService'>;

/** A working set a database opens from and reports to, as `EchoClient.constructDatabase` takes it. */
export type WorkingSet = NonNullable<Parameters<EchoClient['constructDatabase']>[0]['workingSet']>;

export type Options = {
  /**
   * Host-side ECHO services for the space the code runs against, resolved per evaluation so the served set follows
   * the host lifecycle.
   */
  readonly echo: (spaceId: SpaceId) => EchoAccess;
  /**
   * For services that write through to a store and push no client's writes to another (EDGE's): brings every document
   * the host's database and the worker hold up to date with the store. Given, each side's writes are handed over by a
   * flush and this refresh rather than by heads, which such services can neither report nor wait for.
   */
  readonly refresh?: () => Promise<void>;
  /**
   * The working set the host keeps for the space, if any: the worker's database opens over it, so it reads the writes
   * of the calls before it that the index does not hold yet, and reports its own writes to it.
   */
  readonly workingSet?: (spaceId: SpaceId) => WorkingSet | undefined;
  /**
   * Module the worker runs. Defaults to the entry beside this one, under the extension this module
   * was itself loaded under — a worker starts from a real file, not through a bundler.
   */
  readonly entry?: URL;
  /** Spawns the worker, for a runtime whose worker is not `node:worker_threads`. */
  readonly spawn?: (entry: URL | undefined, init: SandboxInit) => Promise<WorkerHandle>;
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
 * A thread or Web Worker is NOT a security boundary: it shares the host's permissions and can reach
 * the network and the filesystem, so it bounds time and isolates crashes, not authority. A Worker
 * Loader isolate (`WorkerSandboxWorkerd`) is one, and its handle limits what it is served.
 */
export const make = (options: Options): Sandbox.Sandbox => ({
  evaluate: ({ code, dialect, context, timeout }) =>
    Effect.gen(function* () {
      const { db } = Context.get(context.runtime, Database.Service);
      const space = spaceOf(db);
      if (space === undefined) {
        return yield* Effect.fail(
          new Sandbox.EvaluationError({ message: `Database ${db.spaceId} has no root to open in the worker.` }),
        );
      }
      // The host's services can be unavailable (a client mid-reconnect); that is this call's failure.
      const echo = yield* Effect.try({
        try: () => options.echo(db.spaceId),
        catch: (error) =>
          new Sandbox.EvaluationError({ message: `No ECHO services for the worker: ${describe(error)}` }),
      });
      const workingSet = options.workingSet?.(db.spaceId);
      const init: SandboxInit = {
        code,
        dialect: dialect.name,
        names: Object.keys(dialect.bindings(context)),
        handover: options.refresh === undefined ? 'heads' : 'flush',
        workingSet: workingSet !== undefined,
        space,
        types: registrySnapshot(db),
        skills: context.skills,
        operations: context.operations.map((operation) => ({
          key: String(operation.definition?.meta.key ?? operation.name),
          name: operation.name,
          description: operation.description,
          parameters: operation.parameters,
          backed: operation.definition !== undefined,
        })),
      };

      const refresh = options.refresh === undefined ? undefined : refreshing(options.refresh);
      const settled = yield* Deferred.make<unknown, Sandbox.EvaluationError>();
      // What the code wrote, reported with its result; waited on after the budget, not within it.
      let written: Wire.Heads = {};

      const handle = yield* Effect.acquireRelease(
        Effect.promise(() => (options.spawn ?? spawnNodeWorker)(options.entry, init)),
        ({ terminate }) => Effect.sync(terminate),
      );

      const served = handle.limit?.(echo) ?? echo;
      const server = Rpc.serve(
        handle.port,
        SandboxRpcs,
        Layer.merge(
          makeClientServicesHandlers({ services: () => served }),
          SandboxHostRpcs.toLayer({
            'Sandbox.print': ({ values }) => Effect.sync(() => context.print(...values)),
            'Sandbox.invokeOperation': ({ key, input }) => invokeOperation(context, key, input),
            'Sandbox.invokeDefinition': ({ key, input, heads }) =>
              invokeDefinition(context, key, input, heads, refresh),
            // A host without one reports an empty set and drops reports; the worker asks only when told it has one.
            'Sandbox.workingSetGet': () =>
              workingSet === undefined ? Effect.succeed({ rows: [] }) : Effect.promise(() => workingSet.get()),
            'Sandbox.workingSetPut': ({ report }) =>
              workingSet === undefined ? Effect.void : Effect.promise(() => workingSet.put(report)),
            'Sandbox.resolveType': ({ uri }) => resolveType(context, uri),
            'Sandbox.complete': ({ value, failure, heads }) =>
              Effect.sync(() => {
                written = heads;
              }).pipe(
                Effect.andThen(
                  Deferred.complete(
                    settled,
                    failure === null
                      ? Effect.succeed(value)
                      : Effect.fail(new Sandbox.EvaluationError({ message: failure })),
                  ),
                ),
                Effect.asVoid,
              ),
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
      // The turn carries on against this database, so it waits for what the code wrote either way.
      const caughtUp = Effect.suspend(() => (refresh === undefined ? Wire.catchUp(db, written) : refresh)).pipe(
        Effect.catch((error) =>
          Effect.sync(() => log.warn('code-mode worker writes not yet visible to the host', { error })),
        ),
      );
      return yield* (
        timeout === undefined
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
            )
      ).pipe(Effect.ensuring(caughtUp));
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

/** How long a refresh may take, as long as a heads catch-up may wait: each runs after the code's budget. */
const REFRESH_TIMEOUT = Duration.seconds(5);

/** {@link Options.refresh} as an effect, failing as a hand-over does, and bounded as one is. */
const refreshing = (refresh: () => Promise<void>): Effect.Effect<void, Wire.WireError> =>
  Effect.tryPromise({
    try: refresh,
    catch: (cause) => new Wire.WireError({ message: "The other side's changes could not be read.", cause }),
  }).pipe(
    Effect.timeoutOrElse({
      duration: REFRESH_TIMEOUT,
      orElse: () => Effect.fail(new Wire.WireError({ message: "The other side's changes were not read in time." })),
    }),
  );

/** A type the host's database resolves, by its DXN, as the worker rebuilds it; null for none the worker can rebuild. */
const resolveType = (context: BindingsContext, uri: string) => {
  if (!DXN.isDXN(uri)) {
    return Effect.succeed(null);
  }
  const { db } = Context.get(context.runtime, Database.Service);
  return Effect.tryPromise(() => resolveTypeOf(db, URI.make(uri))).pipe(
    Effect.map((entity) => describeType(entity) ?? null),
    Effect.orElseSucceed(() => null),
  );
};

/** Runs the worker's `Operation.invoke` through the turn's `Operation.Service`, as the Effect dialect does in-process. */
const invokeDefinition = (
  context: BindingsContext,
  key: string,
  input: unknown,
  heads: Wire.Heads,
  refresh: Effect.Effect<void, Wire.WireError> | undefined,
) => {
  const definition = context.operations.find(
    (candidate) => candidate.definition !== undefined && String(candidate.definition.meta.key) === key,
  )?.definition;
  if (definition === undefined) {
    return Effect.succeed({ _tag: 'Error' as const, message: `Unknown operation: ${key}` });
  }
  const { db } = Context.get(context.runtime, Database.Service);
  // Read the worker's writes before resolving what it named; afterwards write the operation's, and with `refresh` push
  // them to the worker, whose reply arrives after the documents it sent on the same channel.
  const catchUp = refresh === undefined ? Wire.catchUp(db, heads) : refresh;
  const settle = refresh === undefined ? Wire.settle(db) : Wire.flush(db).pipe(Effect.tap(() => refresh));
  return catchUp.pipe(
    Effect.andThen(Wire.decode(input, db)),
    // A reference to an object of another type fails here, before the operation runs, naming both types.
    Effect.flatMap((decoded) =>
      Effect.try({
        try: () => toRefs(definition.input.ast, decoded),
        catch: (error) => new Sandbox.EvaluationError({ message: describe(error) }),
      }),
    ),
    Effect.flatMap((input) => Operation.invoke(definition, input)),
    Effect.flatMap((value) => settle.pipe(Effect.map((heads) => ({ value: Wire.encode(value, db), heads })))),
    Effect.provide(context.runtime),
    Effect.match({
      onSuccess: ({ value, heads }) => ({ _tag: 'Ok' as const, value, heads }),
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
    const type = describeType(entity);
    return type === undefined ? [] : [type];
  });

/**
 * A type as the worker rebuilds it. A relation's kind and endpoints do not survive the JSON-schema round trip — the
 * worker would rebuild it as an object type — so it stays out of the worker rather than resolving as the wrong kind.
 */
const describeType = (entity: unknown): SandboxType | undefined => {
  if (!Type.isType(entity) || Type.isRelation(entity)) {
    return undefined;
  }
  const typename = Type.getTypename(entity);
  const version = Type.getVersion(entity);
  const skills = Skill.annotatedSkillKeys(entity);
  return typename === undefined || version === undefined
    ? undefined
    : { typename, version, jsonSchema: JsonSchema.toJsonSchema(entity), ...(skills.length > 0 && { skills }) };
};

/**
 * The space as the worker's client must name it to open the same database.
 *
 * `Database` publishes only the space id; the key and root document are on the ECHO client's
 * concrete database (every database a host hands a turn), so they are read structurally rather
 * than widening the interface for the one caller that needs them.
 */
const spaceOf = (db: Database.Database): SandboxInit['space'] | undefined => {
  const rootUrl = 'rootUrl' in db && typeof db.rootUrl === 'string' ? db.rootUrl : undefined;
  const spaceKey = 'spaceKey' in db && db.spaceKey instanceof PublicKey ? db.spaceKey.toHex() : undefined;
  return rootUrl === undefined || spaceKey === undefined
    ? undefined
    : { spaceId: String(db.spaceId), spaceKey, rootUrl };
};

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
const spawnNodeWorker = async (entry: URL | undefined, init: SandboxInit): Promise<WorkerHandle> => {
  const { MessageChannel, Worker } = await import('node:worker_threads');
  const channel = new MessageChannel();
  const instance = new Worker(entry ?? defaultEntry(), {
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
export const layer = (options: Options): Layer.Layer<Sandbox.Service> => Layer.succeed(Sandbox.Service, make(options));
