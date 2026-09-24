//
// Copyright 2026 DXOS.org
//

import * as BrowserWorker from '@effect/platform-browser/BrowserWorker';
import * as Cause from 'effect/Cause';
import * as Context from 'effect/Context';
import * as Data from 'effect/Data';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';
import * as RpcClient from 'effect/unstable/rpc/RpcClient';

import * as Operation from '@dxos/compute/Operation';
import { Database, JsonSchema, Type } from '@dxos/echo';
import { EchoClient } from '@dxos/echo-client';
import { EffectEx } from '@dxos/effect';
import { DXN, PublicKey, SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';

import { EffectDialect } from './dialect-effect.ts';
import { PlainDialect } from './dialect-plain.ts';
import { type Dialect, type SandboxOperation } from './Dialect.ts';
import * as Wire from './Wire.ts';
import { type SandboxInit, SandboxRpcs } from './WorkerSandboxProtocol.ts';

/**
 * The model's code, running on its own thread against its own ECHO client — whichever platform the
 * thread belongs to. The entries (`WorkerSandboxEntry` for `node:worker_threads`,
 * `WorkerSandboxBrowserEntry` for a Web Worker) only receive the port and the init and hand them here.
 *
 * Nothing here is special-cased for the sandbox: the worker connects an ordinary {@link EchoClient}
 * to the host's services and asks the dialect for its ordinary bindings, so the code sees the same
 * live objects and the same API it would in-process. The host's only extra job is the handful of
 * calls ECHO has no service for — printing, invoking a skill's operation, and reporting the result.
 */

// eslint-disable-next-line @typescript-eslint/no-implied-eval
const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;

/** An operation the host ran for the worker and reported failed. */
class OperationFailed extends Data.TaggedError('OperationFailed')<{ readonly message: string }> {}

/** Whatever the model's code threw, named so the error channel carries more than `unknown`. */
class ModelCodeFailed extends Data.TaggedError('ModelCodeFailed')<{ readonly message: string }> {}

const DIALECTS: Record<string, Dialect> = {
  [PlainDialect.name]: PlainDialect,
  [EffectDialect.name]: EffectDialect,
};

/** The channel home. Until this exists there is no way to report anything, so it stands alone. */
const connect = (port: MessagePort) =>
  Effect.gen(function* () {
    // The same transport `Rpc.makeClient` builds, taken directly so the client is typed by the group
    // rather than by an assertion; neither end applies the timing middleware.
    const protocol = yield* Layer.build(
      RpcClient.layerProtocolWorker({ size: 1, concurrency: Number.MAX_SAFE_INTEGER }).pipe(
        Layer.provide(BrowserWorker.layer(() => port)),
      ),
    );
    return yield* RpcClient.make(SandboxRpcs, { disableTracing: true }).pipe(Effect.provide(protocol));
  });

/** The client both halves of the protocol are reached through. */
type SandboxClient = Effect.Success<ReturnType<typeof connect>>;

/** Everything from connecting ECHO to running the model's code; its outcome is what the host waits on. */
const evaluate = (client: SandboxClient, init: SandboxInit) =>
  Effect.gen(function* () {
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
    //
    // One at a time: the JSON-schema round trip does not cover every schema (a record keyed by a
    // pattern, for one), and a type the worker cannot rebuild must cost only that type — not every
    // evaluation in a workspace that happens to register it.
    const types = init.types.flatMap(({ typename, version, jsonSchema }) => {
      try {
        return [Type.makeObject(DXN.make(typename, version))(JsonSchema.toEffectSchema(jsonSchema))];
      } catch (error) {
        log.warn('code-mode worker cannot rebuild type; it is unavailable to the sandbox', { typename, error });
        return [];
      }
    });
    yield* Effect.promise(async () => {
      await echo.graph.registry.add(types);
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

    // The definition here is a stand-in carrying only the key: the real one is code that stays on
    // the host with its handler. It exists so the Effect dialect can bind `ops` and the model can
    // write `Operation.invoke(ops[key], input)` exactly as in-process; the call itself crosses home
    // through the forwarding service below, where the conversation it belongs to lives.
    const operations: SandboxOperation[] = init.operations.map(({ key, name, description, parameters }) => ({
      name,
      description,
      parameters,
      definition: standInDefinition(key, name, description),
      invoke: (input: unknown) => invokeOperation(key, toWire(input)),
    }));

    // `Operation.invoke` crosses with its objects, and with the heads of what each side wrote so the
    // other reads them only once they have arrived.
    const invokeDefinition = (key: string, input: unknown) =>
      Wire.settle(db).pipe(
        Effect.flatMap((heads) => client['Sandbox.invokeDefinition']({ key, input: Wire.encode(input), heads })),
        Effect.flatMap(
          (outcome): Effect.Effect<unknown, OperationFailed | Wire.ObjectNotFoundError | Wire.ReplicationError> =>
            outcome._tag === 'Ok'
              ? Wire.catchUp(db, outcome.heads).pipe(Effect.andThen(Wire.decode(outcome.value, db)))
              : Effect.fail(new OperationFailed({ message: outcome.message })),
        ),
        Effect.orDie,
      );

    const runtime = Context.make(Database.Service, { db }).pipe(
      Context.add(Operation.Service, forwardOperations(invokeDefinition)),
    );

    const dialect = DIALECTS[init.dialect];
    if (dialect === undefined) {
      // Named rather than left to fail as `undefined.bindings`, since the host chose this value.
      return yield* Effect.fail(new ModelCodeFailed({ message: `Unknown dialect: ${init.dialect}` }));
    }
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
    return yield* Effect.tryPromise({
      try: () => new AsyncFunction(...names, `'use strict';\n${init.code}`)(...names.map((name) => bindings[name])),
      catch: (error: unknown) => new ModelCodeFailed({ message: describe(error) }),
    }).pipe(
      Effect.match({
        onSuccess: (value: unknown) => ({ value, failure: null }),
        onFailure: (error: ModelCodeFailed) => ({ value: undefined, failure: error.message }),
      }),
      // The turn carries on against the host's database, so it waits for what the code wrote.
      Effect.flatMap((result) => Wire.settle(db).pipe(Effect.map((heads) => ({ ...result, heads })))),
    );
  });

/**
 * One report per evaluation, whatever happened.
 *
 * The host is waiting on `Sandbox.complete` and has no other way to learn the worker got nowhere:
 * a setup failure that never reported would leave it waiting for its whole budget and then blame a
 * timeout. A failure BEFORE the channel exists cannot be reported this way; the entry turns that
 * into whatever its platform's host watches for (an exit code, a message on the worker itself).
 */
export const runSandboxWorker = (port: MessagePort, init: SandboxInit) =>
  Effect.gen(function* () {
    const client = yield* connect(port);
    const exit = yield* Effect.exit(evaluate(client, init));
    yield* client['Sandbox.complete'](
      Exit.isSuccess(exit) ? exit.value : { value: undefined, failure: Cause.pretty(exit.cause), heads: {} },
    );
  });

/**
 * A definition naming an operation by key, for a dialect that binds definitions. Absent for a tool
 * with no operation behind it (provider-defined, MCP), whose key is its tool name, not a DXN.
 */
const standInDefinition = (key: string, name: string, description: string | undefined) =>
  DXN.isDXN(key)
    ? Operation.make({
        // The key is the host's own, carried across the thread; the literal lives where the real
        // definition is declared, which is what the rule protects.
        // eslint-disable-next-line @dxos/rules/operation-key-shape
        meta: { key, name, description },
        input: Schema.Unknown,
        output: Schema.Unknown,
      })
    : undefined;

/**
 * `Operation.invoke` here resolves by key and runs the operation on the host. Scheduling a
 * follow-up is not something the model's code can do from a sandbox, so it stays loud.
 */
const forwardOperations = (
  invoke: (key: string, input: unknown) => Effect.Effect<unknown>,
): Operation.OperationService => ({
  invoke: (op, ...[input]) =>
    invoke(String(op.meta.key), input).pipe(Effect.flatMap(Schema.decodeUnknownEffect(op.output)), Effect.orDie),
  schedule: () => Effect.die(new Error('Scheduling an operation is not available inside the sandbox.')),
  invokePromise: (op, ...[input]) =>
    EffectEx.runPromise(
      invoke(String(op.meta.key), input).pipe(Effect.flatMap(Schema.decodeUnknownEffect(op.output)), Effect.orDie),
    ).then(
      (data) => ({ data }),
      (error: unknown) => ({ error: error instanceof Error ? error : new Error(describe(error)) }),
    ),
});

/**
 * A tool call's input as it crosses the thread: its JSON form, which is what the host's tool path
 * takes from any caller and what the plain dialect's `ops` produce in-process too.
 */
const toWire = (input: unknown): unknown => (input === undefined ? undefined : JSON.parse(JSON.stringify(input)));

/** Reads a message out of whatever the model's code threw, which is not necessarily an `Error`. */
const describe = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message.length > 0 ? error.message : String(error);
  }
  const text = String(error);
  return text.length > 0 && text !== '[object Object]' ? text : 'Unknown failure.';
};
