//
// Copyright 2026 DXOS.org
//

import * as BrowserWorker from '@effect/platform-browser/BrowserWorker';
import * as Context from 'effect/Context';
import * as Data from 'effect/Data';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Scope from 'effect/Scope';
import * as RpcClient from 'effect/unstable/rpc/RpcClient';
import * as WorkerThreads from 'node:worker_threads';

import * as Operation from '@dxos/compute/Operation';
import { Database, JsonSchema, Type } from '@dxos/echo';
import { EchoClient } from '@dxos/echo-client';
import { DXN, PublicKey, SpaceId } from '@dxos/keys';

import { EffectDialect } from './dialect-effect.ts';
import { PlainDialect } from './dialect-plain.ts';
import { type Dialect, type SandboxOperation } from './Dialect.ts';
import { type SandboxInit, SandboxRpcs } from './WorkerSandboxProtocol.ts';

/**
 * The model's code, running on its own thread against its own ECHO client.
 *
 * Nothing here is special-cased for the sandbox: the worker connects an ordinary {@link EchoClient}
 * to the host's services and asks the dialect for its ordinary bindings, so the code sees the same
 * live objects and the same API it would in-process. The host's only extra job is the handful of
 * calls ECHO has no service for — printing, invoking a skill's operation, and reporting the result.
 */

// eslint-disable-next-line @typescript-eslint/no-implied-eval
const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;

/** Whatever the model's code threw, named so the error channel carries more than `unknown`. */
class ModelCodeFailed extends Data.TaggedError('ModelCodeFailed')<{ readonly message: string }> {}

const DIALECTS: Record<string, Dialect> = {
  [PlainDialect.name]: PlainDialect,
  [EffectDialect.name]: EffectDialect,
};

const { port, init } = WorkerThreads.workerData as { port: MessagePort; init: SandboxInit };

const main = Effect.gen(function* () {
  // The same transport `Rpc.makeClient` builds, taken directly so the client is typed by the group
  // rather than by an assertion; neither end applies the timing middleware.
  const protocol = yield* Layer.build(
    RpcClient.layerProtocolWorker({ size: 1, concurrency: Number.MAX_SAFE_INTEGER }).pipe(
      Layer.provide(BrowserWorker.layer(() => port)),
    ),
  );
  const client = yield* RpcClient.make(SandboxRpcs, { disableTracing: true }).pipe(Effect.provide(protocol));

  const echo = new EchoClient({});
  // The worker is simply another client of the host's services — the same connection the tab makes.
  echo.connectToService({ dataService: client, queryService: client });
  yield* Effect.promise(() => echo.open());

  // A registered type is a class, which cannot cross a thread; its schema can, so the worker
  // rebuilds each one and registers it. Queries and `make` then name types exactly as on the host.
  //
  // Rebuilt through the effect schema rather than by `makeObjectFromJsonSchema`, which returns a
  // STORED schema entity — one the registry holds but `Type.isObject` rejects, so `make` would not
  // find a type to construct from.
  yield* Effect.promise(async () => {
    await echo.graph.registry.add(
      init.types.map(({ typename, version, jsonSchema }) =>
        Type.makeObject(DXN.make(typename, version))(JsonSchema.toEffectSchema(jsonSchema)),
      ),
    );
  });

  const db = echo.constructDatabase({
    spaceId: SpaceId.make(init.space.spaceId),
    spaceKey: PublicKey.from(init.space.spaceKey),
  });
  yield* Effect.promise(() => db.setSpaceRoot(init.space.rootUrl));
  yield* Effect.promise(() => db.open());

  const invokeOperation = (key: string, input: unknown) =>
    client['Sandbox.invokeOperation']({ key, input }).pipe(
      Effect.flatMap((outcome) =>
        outcome._tag === 'Ok' ? Effect.succeed(outcome.value) : Effect.die(new Error(outcome.message)),
      ),
      Effect.orDie,
    );

  // No `definition`: an operation's definition is code, and rebuilding one here would only let a
  // dialect believe it holds the real thing. What crosses is the call — `invoke` reaches the
  // handler on the host, where the conversation it belongs to lives.
  const operations: SandboxOperation[] = init.operations.map(({ key, name, description, parameters }) => ({
    name,
    description,
    parameters,
    invoke: (input: unknown) => invokeOperation(key, input),
  }));

  const runtime = Context.make(Database.Service, { db }).pipe(
    Context.add(Operation.Service, operationsAreNotAmbientHere),
  );

  const dialect = DIALECTS[init.dialect];
  const bindings = dialect.bindings({
    runtime,
    operations,
    // Sent as it happens rather than batched with the result, so output survives a worker that is
    // killed for outrunning its budget.
    print: (...values: unknown[]) => {
      Effect.runFork(client['Sandbox.print']({ values }));
    },
  });

  const names = Object.keys(bindings);
  const outcome = yield* Effect.tryPromise({
    try: () => new AsyncFunction(...names, `'use strict';\n${init.code}`)(...names.map((name) => bindings[name])),
    catch: (error: unknown) => new ModelCodeFailed({ message: describe(error) }),
  }).pipe(
    Effect.match({
      onSuccess: (value: unknown) => ({ value, failure: null }),
      onFailure: (error: ModelCodeFailed) => ({ value: undefined, failure: error.message }),
    }),
  );

  yield* client['Sandbox.complete'](outcome);
});

/**
 * The sandbox reaches operations through the dialect's own binding, which carries the key home; it
 * never resolves one from the ambient service, because the definitions live on the host. Present so
 * the runtime context is complete, and loud rather than silent if something does reach for it.
 */
const unavailable = () => new Error('An operation must be invoked through the sandbox, not resolved here.');
const operationsAreNotAmbientHere: Operation.OperationService = {
  invoke: () => Effect.die(unavailable()),
  schedule: () => Effect.die(unavailable()),
  invokePromise: () => Promise.resolve({ error: unavailable() }),
};

/** Reads a message out of whatever the model's code threw, which is not necessarily an `Error`. */
const describe = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message.length > 0 ? error.message : String(error);
  }
  const text = String(error);
  return text.length > 0 && text !== '[object Object]' ? text : 'Unknown failure.';
};

Effect.runFork(Effect.scoped(main).pipe(Scope.provide(Effect.runSync(Scope.make()))));
