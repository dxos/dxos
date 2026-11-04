//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import * as Stream from 'effect/Stream';

import * as Operation from '@dxos/compute/Operation';
import { Database, Entity, Obj } from '@dxos/echo';
import * as EffectEx from '@dxos/effect/EffectEx';
import { BaseError } from '@dxos/errors';
import { DXN, EntityId, type SpaceId, URI } from '@dxos/keys';
import { log } from '@dxos/log';
import { ErrorCodec } from '@dxos/protocols';
import type { PluginProtocol } from '@dxos/protocols';

import * as Output from './Output.ts';
import * as RequestContext from './RequestContext.ts';

//
// What operation-service gives a handler beyond its function context (EDGE-PLUGINS F-5.7): services only EDGE holds,
// and other plugins' operations.
//

type Handler = Operation.WithHandler<Operation.Definition.Any>;

/** A call to a service EDGE serves failed; `context` names the service, the method and the error EDGE reported. */
export class HostServiceError extends BaseError.extend('HostServiceError', 'The EDGE service call failed.') {}

/** A method of a service proxied to EDGE: an Effect, or a Stream for the methods its descriptor names. */
type Method = (
  ...args: readonly unknown[]
) => Effect.Effect<unknown, HostServiceError> | Stream.Stream<unknown, HostServiceError>;

type Proxied = Readonly<Record<string, Method>>;

/** Properties a proxy must not answer: a thenable check, or a probe by the runtime, is not a method call. */
const NOT_METHODS = new Set(['then', 'toJSON', 'constructor']);

const call = (
  host: PluginProtocol.ServiceHost,
  service: string,
  method: string,
  args: readonly unknown[],
): Effect.Effect<unknown, HostServiceError> =>
  Effect.tryPromise({
    try: () =>
      host.call(
        service,
        method,
        args.map((arg) => Output.encode(arg)),
      ),
    catch: (cause) => new HostServiceError({ cause, context: { service, method } }),
  }).pipe(
    Effect.flatMap((result) =>
      result.ok
        ? Effect.succeed(result.value)
        : Effect.fail(
            new HostServiceError({
              message: result.error.message,
              context: { service, method, name: result.error.name },
            }),
          ),
    ),
  );

/** A service whose every method calls EDGE with JSON arguments; a method that returns a stream gets its items as an array. */
const makeProxy = (descriptor: PluginProtocol.ServiceDescriptor, host: PluginProtocol.ServiceHost): Proxied => {
  const streams = new Set(descriptor.streams ?? []);
  return new Proxy<Proxied>(
    {},
    {
      get: (_target, property) => {
        if (typeof property !== 'string' || NOT_METHODS.has(property)) {
          return undefined;
        }
        return streams.has(property)
          ? (...args: readonly unknown[]) =>
              Stream.fromIterableEffect(
                call(host, descriptor.key, property, args).pipe(
                  Effect.flatMap((value) =>
                    Array.isArray(value)
                      ? Effect.succeed(value)
                      : Effect.fail(
                          new HostServiceError({
                            message: 'EDGE answered a stream with something other than a list.',
                            context: { service: descriptor.key, method: property },
                          }),
                        ),
                  ),
                ),
              )
          : (...args: readonly unknown[]) => call(host, descriptor.key, property, args);
      },
    },
  );
};

/**
 * Gives the handler every service EDGE serves to this invocation, keyed as the plugin declares it: Effect resolves a
 * service by its key, so a proxy under the same key satisfies the plugin's own tag.
 */
export const withHostServices = (handler: Handler, services: PluginProtocol.HostServices | undefined): Handler =>
  services === undefined || services.descriptors.length === 0
    ? handler
    : RequestContext.mapHandler(handler, (effect) =>
        services.descriptors.reduce(
          (provided, descriptor) =>
            provided.pipe(
              Effect.provideService(Context.Service<Proxied>(descriptor.key), makeProxy(descriptor, services.host)),
            ),
          effect,
        ),
      );

/** The bare key EDGE routes by (`org.example.op`). */
const bareKey = (key: string): string => (DXN.isDXN(key) ? DXN.getName(key) : key);

export type OperationsOptions = {
  /** The context the bundle's handler runs in, which its own nested operations run in too. */
  readonly context: Context.Context<unknown>;
  /** The bundle's own handlers, run in process. */
  readonly handlers: readonly Handler[];
  /** EDGE's router, for every other operation; without it only the bundle's own run. */
  readonly host: PluginProtocol.OperationHost | undefined;
  readonly spaceId: SpaceId | undefined;
  readonly conversation: string | undefined;
  /** The invocation's pid, every nested invocation's parent. */
  readonly pid: string;
  readonly idSeed: PluginProtocol.IdSeed | undefined;
};

/**
 * `Operation.Service` for a bundle's handler: an operation of the bundle runs in process, keeping its inputs' live
 * objects; any other re-enters EDGE's router, which runs it in the bundle that implements it.
 */
export const makeOperations = ({
  context,
  handlers,
  host,
  spaceId,
  conversation,
  pid,
  idSeed,
}: OperationsOptions): Operation.OperationService => {
  const local = (op: Operation.Definition.Any): Handler | undefined => {
    const key = bareKey(String(op.meta.key));
    return handlers.find((entry) => bareKey(String(entry.meta.key)) === key);
  };

  const remote = (op: Operation.Definition.Any, input: unknown, options: Operation.InvokeOptions | undefined) => {
    if (host === undefined) {
      return Effect.die(
        new Error(`${String(op.meta.key)} is not an operation of this plugin, and EDGE serves no others.`),
      );
    }
    const nested = {
      ...((options?.spaceId ?? spaceId) === undefined ? {} : { spaceId: options?.spaceId ?? spaceId }),
      ...((options?.conversation ?? conversation) === undefined
        ? {}
        : { conversation: options?.conversation ?? conversation }),
      parentPid: pid,
      // TEST-ONLY: a child seed drawn from the seeded stream keeps the whole call tree reproducible.
      ...(idSeed === undefined ? {} : { idSeed: { time: idSeed.time, seed: childSeed(EntityId.random()) } }),
    };
    return Effect.promise(async () => host.invoke(bareKey(String(op.meta.key)), await byReference(input), nested)).pipe(
      Effect.flatMap((result) =>
        result.ok
          ? Effect.promise(() => loadEntities(result.output))
          : // The callee's own error, as operation-service would have raised it.
            Effect.die(
              result.error.encoded === undefined
                ? new Error(`${String(op.meta.key)} failed on EDGE: ${result.error.message}`)
                : ErrorCodec.decode(result.error.encoded),
            ),
      ),
    );
  };

  /**
   * The invocation's database, where another bundle's call finds the objects this one passes it; undefined outside a
   * space, where `Database.notAvailable` throws on access.
   */
  const databaseOf = (): Database.Database | undefined => {
    const service = Option.getOrUndefined(Context.getOption(context, Database.Service));
    try {
      return service?.db;
    } catch {
      return undefined;
    }
  };

  /**
   * The input with every entity as a reference: one this invocation has not added yet is added and flushed first, so
   * the callee loads the graph it heads, as an in-process call would receive it.
   */
  const byReference = async (input: unknown): Promise<unknown> => {
    const database = databaseOf();
    if (database === undefined) {
      return Output.encode(input);
    }
    const unsaved = collectEntities(input).filter((entity) => Obj.getDatabase(entity) === undefined);
    if (unsaved.length > 0) {
      for (const entity of unsaved) {
        database.add(entity);
      }
      await database.flush();
    }
    return Output.encode(input, { entities: 'reference' });
  };

  /** The output with each entity's JSON form and each ref restored from this invocation's database. */
  const loadEntities = async (output: unknown): Promise<unknown> => {
    const database = databaseOf();
    return database === undefined
      ? output
      : Output.decodeEntities(
          output,
          (uri) => database.makeRef(URI.make(uri)).load(),
          (uri) => database.makeRef(URI.make(uri)),
        );
  };

  /**
   * TEST-ONLY. Re-pins the seed as operation-service does for a nested invocation, which then mints its pid: the
   * caller's ids after the call continue the child's stream, so a replayed fixture sees the same ids on both paths.
   */
  const pinChildSeed = (): void => {
    if (idSeed !== undefined) {
      EntityId.dangerouslySetSeed(idSeed.time, childSeed(EntityId.random()));
      EntityId.random();
    }
  };

  /** The output of a local run is the handler's value; of a remote one its encoded form, decoded here. */
  const run = <I, O>(
    op: Operation.Definition<I, O>,
    input: unknown,
    options: Operation.InvokeOptions | undefined,
  ): Effect.Effect<O> => {
    const handler = local(op);
    return (
      handler === undefined
        ? // With a database the entities and refs are restored, so the output is checked against the type side.
          remote(op, input, options).pipe(
            Effect.flatMap((output) =>
              databaseOf() === undefined ? Schema.decodeUnknownEffect(op.output)(output) : checkOutput(op, output),
            ),
          )
        : // The handler's own nested operations go through this service too.
          Effect.promise(() => {
            pinChildSeed();
            return Effect.runPromiseExitWith(Context.add(context, Operation.Service, service))(handler.handler(input));
          }).pipe(
            Effect.flatMap((exit) => exit),
            Effect.flatMap((output) => checkOutput(op, output)),
          )
    ).pipe(Effect.orDie);
  };

  const service: Operation.OperationService = {
    invoke: (op, ...[input, options]) => run(op, input, options),
    // Run to completion before the invocation returns, since workerd drops work left running after it; a followup's
    // failure does not fail the operation that emitted it, as in compute-runtime.
    schedule: (op, ...[input, options]) =>
      run(op, input, options).pipe(
        Effect.exit,
        Effect.tap((exit) =>
          Exit.isFailure(exit)
            ? Effect.sync(() => log.warn('scheduled operation failed', { key: op.meta.key }))
            : Effect.void,
        ),
        Effect.asVoid,
      ),
    invokePromise: (op, ...[input, options]) =>
      EffectEx.runPromise(run(op, input, options)).then(
        (data) => ({ data }),
        (error: unknown) => ({ error: error instanceof Error ? error : new Error(String(error)) }),
      ),
  };
  return service;
};

/** Gives the handler {@link makeOperations}, in place of the function context's, which needs a deployed id. */
export const withOperations = (handler: Handler, options: Omit<OperationsOptions, 'context'>): Handler =>
  RequestContext.mapHandler(handler, (effect) =>
    Effect.flatMap(Effect.context<unknown>(), (context) =>
      effect.pipe(Effect.provideService(Operation.Service, makeOperations({ ...options, context }))),
    ),
  );

/**
 * The output checked against the operation's type side and returned as it is: decoding would rebuild a struct around
 * every field, so a live object would come back as a plain copy that `Obj.instanceOf` rejects.
 */
const checkOutput = <I, O>(op: Operation.Definition<I, O>, output: unknown) => {
  const type = Schema.toType(op.output);
  return Schema.is(type)(output) ? Effect.succeed(output) : Schema.decodeUnknownEffect(type)(output);
};

/** TEST-ONLY. FNV-1a of an id, as operation-service derives a nested invocation's seed. */
const childSeed = (id: string): number => {
  let hash = 2166136261;
  for (let index = 0; index < id.length; index++) {
    hash ^= id.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

/** Every entity in plain objects and arrays, outermost first. */
const collectEntities = (value: unknown, seen = new WeakSet<object>()): Entity.Unknown[] => {
  if (Entity.isEntity(value)) {
    return [value];
  }
  if (value === null || typeof value !== 'object' || seen.has(value)) {
    return [];
  }
  seen.add(value);
  const prototype = Object.getPrototypeOf(value);
  if (!Array.isArray(value) && prototype !== Object.prototype && prototype !== null) {
    return [];
  }
  return Object.values(value).flatMap((entry) => collectEntities(entry, seen));
};
