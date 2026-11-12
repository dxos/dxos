//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Schema from 'effect/Schema';
import * as Scope from 'effect/Scope';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import type * as CapabilityManager from '@dxos/app-framework/CapabilityManager';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as PluginManifest from '@dxos/app-framework/PluginManifest';
import { wrapFunctionHandler } from '@dxos/compute-runtime';
import * as Operation from '@dxos/compute/Operation';
import * as Trace from '@dxos/compute/Trace';
import { type Entity } from '@dxos/echo';
import * as EffectEx from '@dxos/effect/EffectEx';
import { BaseError, messageOf } from '@dxos/errors';
import { ServiceContainer, createFunctionContext } from '@dxos/functions-runtime-cloudflare';
import { DXN, EntityId, SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { ErrorCodec, type FunctionProtocol, PluginProtocol } from '@dxos/protocols';

import * as FileStorage from './FileStorage.ts';
import * as HostServices from './HostServices.ts';
import * as Output from './Output.ts';
import * as PluginActivation from './PluginActivation.ts';
import * as PluginCatalog from './PluginCatalog.ts';
import * as RequestContext from './RequestContext.ts';
import * as TypeSource from './TypeSource.ts';

/**
 * The protocol version this host speaks. The loader's generated main module reads it from the vendored host, which a
 * bundle keeps from its publish, so EDGE learns each bundle's version without activating it.
 */
export const PROTOCOL_VERSION: number = PluginProtocol.PROTOCOL_VERSION;

export class OperationNotFoundError extends BaseError.extend('OperationNotFoundError', 'Operation not found') {}

export class InvalidRequestError extends BaseError.extend('InvalidRequestError', 'Invalid plugin host request') {}

/** The host of one release's plugins. */
export interface Host {
  /** The bundle's catalog. */
  describe(): Promise<PluginProtocol.Catalog>;
  /** Runs an operation; a failure is returned as data, since Workers RPC drops an error's class and stack. */
  invoke(
    request: PluginProtocol.InvokeRequest,
    env: PluginProtocol.Env,
    scope?: PluginProtocol.InvocationScope,
  ): Promise<PluginProtocol.InvokeResult>;
}

export type Options = {
  /** Bound on plugin activation; past it the activation is abandoned so the next request can retry. */
  readonly activationTimeout?: number;
};

const DEFAULT_ACTIVATION_TIMEOUT = 20_000;

/** EDGE invokes operations by their bare key (`org.example.op`); an operation's own key is a DXN (`dxn:org.example.op`). */
const operationKeyName = (key: string): string => (DXN.isDXN(key) ? DXN.getName(key) : key);

/**
 * A plugin from its bundle's `manifest.json`, the way every host builds one: each module body loads through `loaders`,
 * keyed by the URL the manifest gives it, when the module activates.
 */
export const fromManifest = (manifest: unknown, loaders: Plugin.ManifestLoaders): Plugin.Plugin => {
  // A plugin runs alone on EDGE: what it imports from another plugin's package is vendored, and no other plugin is
  // activated beside it, so its `dependsOn` is not resolved.
  const { dependsOn: _dependsOn, ...standalone } = Schema.decodeUnknownSync(PluginManifest.Manifest)(manifest);
  const definition = PluginManifest.toDefinition(standalone);
  if (definition === undefined) {
    throw new InvalidRequestError({ message: 'The plugin manifest lists no modules.' });
  }
  return Plugin.fromManifest(definition, loaders).make();
};

/**
 * Hosts plugins as the main module of an EDGE plugin release.
 *
 * `makePlugins` is called inside the first request, so plugin options may read request-scoped state.
 */
export const make = (makePlugins: () => PluginActivation.Plugins, options: Options = {}): Host => {
  const getActivation = memoizeActivation(makePlugins, options.activationTimeout ?? DEFAULT_ACTIVATION_TIMEOUT);

  const describe = async () => PluginCatalog.make(await getActivation());

  const run = async (
    request: PluginProtocol.InvokeRequest,
    env: PluginProtocol.Env,
    scope: PluginProtocol.InvocationScope,
  ): Promise<unknown> => {
    const activation = await getActivation();
    const operationKey = operationKeyName(request.operationKey);
    const handler = activation.operationHandlers.find(
      (entry) => operationKeyName(String(entry.meta.key)) === operationKey,
    );
    if (!handler) {
      throw new OperationNotFoundError({ context: { key: request.operationKey } });
    }
    const spaceId = request.spaceId;
    if (spaceId !== undefined && !SpaceId.isValid(spaceId)) {
      throw new InvalidRequestError({ message: `Invalid spaceId: ${spaceId}` });
    }
    if (scope.conversation !== undefined && spaceId === undefined) {
      throw new InvalidRequestError({ message: 'A conversation is read from a space, and the request names none.' });
    }

    // TEST-ONLY: the seed is a static of the shared `EntityId`, so concurrent invocations on one isolate race; only
    // trusted test harnesses set it.
    if (scope.idSeed !== undefined) {
      EntityId.dangerouslySetSeed(scope.idSeed.time, scope.idSeed.seed);
    }

    // A caller that minted the pid owns the start and end envelopes: only it outlives an isolate killed mid-run.
    const callerOwnsEnvelopes = scope.pid !== undefined;
    const pid = scope.pid ?? EntityId.random();
    const info = { key: operationKey, name: handler.meta.name ?? operationKey };
    const trace = new RequestContext.TraceForwarder(scope.traceSink, {
      pid,
      parentPid: scope.parentPid,
      runId: scope.runId,
      processName: operationKey,
      space: spaceId,
      runtimeName: Trace.CommonRuntimeName.edgeWorkerLoader,
    });
    const cancellation = RequestContext.listenForCancel(scope.cancellation);

    // Set once the invocation's context exists; a nested call can only return after that.
    let serviceContainer: ServiceContainer | undefined;
    // Innermost first: the nested-operation service captures the context every wrapper outside it provides.
    const withOperations = HostServices.withOperations(handler, {
      refreshWorkingSet: async () => serviceContainer?.refreshWorkingSet(),
      handlers: activation.operationHandlers,
      host: scope.operations,
      spaceId,
      conversation: scope.conversation,
      pid,
      idSeed: scope.idSeed,
    });
    const contextual = RequestContext.withConversation(
      RequestContext.withCancellation(
        withCapabilities(
          HostServices.withHostServices(
            withOperations,
            scope.services,
            activation.capabilities.getAll(Capabilities.HostServiceAdapter),
          ),
          activation.capabilities,
        ),
        cancellation.signal,
      ),
      scope.conversation,
    );
    const func = wrapFunctionHandler(contextual, {
      // Registering types needs a database, which exists only for a space-scoped invocation.
      types: spaceId === undefined ? undefined : [...activation.registeredTypes],
      registry: spaceId === undefined ? undefined : registryEntities(activation),
      toolkits: [...activation.toolkits],
      typeSource: env.TYPE_REGISTRY === undefined ? undefined : TypeSource.fromRegistry(env.TYPE_REGISTRY),
      // EDGE's hosted blob store, the default storage of the file backend every bundle is offered.
      blobBackends: FileStorage.blobBackends(env),
      // Another bundle's nested call passes the objects it holds by reference.
      resolveObjectReferences: true,
    });

    if (!callerOwnsEnvelopes) {
      trace.start(info);
    }
    // The in-process rpc clients bridged onto the bindings live for one invocation.
    const serviceScope = Effect.runSync(Scope.make());
    try {
      const made = await makeContext(env, scope, spaceId, serviceScope);
      serviceContainer = made.serviceContainer;
      const context = made.context;
      const output = await func.handler({
        context: { ...context, services: { ...context.services, traceService: trace.service } },
        data: request.input,
      });
      if (!callerOwnsEnvelopes) {
        trace.end(info, undefined);
      }
      return output;
    } catch (error) {
      if (!callerOwnsEnvelopes) {
        trace.end(info, error);
      }
      throw error;
    } finally {
      // First, before anything awaited: a pending `waitForCancel` pins the invocation until the isolate is killed.
      cancellation.dispose();
      try {
        await EffectEx.runPromise(Scope.close(serviceScope, Exit.void));
      } finally {
        await trace.drain();
      }
    }
  };

  const invoke: Host['invoke'] = async (request, env, scope = {}) => {
    try {
      return { ok: true, output: Output.encode(await run(request, env, scope)) };
    } catch (error) {
      log.error('plugin operation failed', { operationKey: request.operationKey, error });
      return { ok: false, error: toFailure(error) };
    }
  };

  return { describe, invoke };
};

const toFailure = (error: unknown): PluginProtocol.Failure => ({
  code:
    error instanceof OperationNotFoundError
      ? 'operation-not-found'
      : error instanceof InvalidRequestError
        ? 'invalid-request'
        : 'failed',
  message: messageOf(error) ?? String(error),
  ...(error instanceof Error ? { name: error.name, stack: error.stack, encoded: ErrorCodec.encode(error) } : {}),
});

/**
 * Activates the plugins once per isolate.
 *
 * The settled activation is cached rather than the promise: a promise created in one request and settled after it
 * ended is dropped by workerd, so a later request must never await a foreign one. The in-flight promise is shared only
 * while a cold start runs, and is bounded so a dropped continuation turns into a retryable error.
 */
const memoizeActivation = (
  makePlugins: () => PluginActivation.Plugins,
  timeout: number,
): (() => Promise<PluginActivation.Activation>) => {
  let activation: PluginActivation.Activation | undefined;
  let pending: Promise<PluginActivation.Activation> | undefined;
  return async () => {
    if (activation !== undefined) {
      return activation;
    }
    pending ??= withTimeout(PluginActivation.activate(makePlugins()), timeout).then(
      (resolved) => {
        if (resolved.failures.length > 0) {
          log.warn('plugin modules failed to activate', { failures: resolved.failures });
        }
        activation = resolved;
        pending = undefined;
        return resolved;
      },
      (error) => {
        pending = undefined;
        throw error;
      },
    );
    return pending;
  };
};

const makeContext = async (
  env: PluginProtocol.Env,
  scope: PluginProtocol.InvocationScope,
  spaceId: SpaceId | undefined,
  serviceScope: Scope.Scope,
): Promise<{ context: FunctionProtocol.Context; serviceContainer?: ServiceContainer }> => {
  const { DATA_SERVICE, QUEUE_SERVICE, FUNCTIONS_AI_SERVICE } = env;
  if (DATA_SERVICE === undefined || QUEUE_SERVICE === undefined || FUNCTIONS_AI_SERVICE === undefined) {
    if (spaceId !== undefined) {
      throw new InvalidRequestError({
        message: 'A space-scoped invocation needs DATA_SERVICE, QUEUE_SERVICE and FUNCTIONS_AI_SERVICE',
      });
    }
    return { context: { services: { accessTokenService: scope.accessTokenService } } };
  }
  const serviceContainer = new ServiceContainer({}, DATA_SERVICE, QUEUE_SERVICE, FUNCTIONS_AI_SERVICE);
  const context = await createFunctionContext({
    serviceContainer,
    contextSpaceId: spaceId,
    serviceScope,
    accessTokenService: scope.accessTokenService,
  });
  return { context, serviceContainer };
};

/**
 * The primary's skills, which a skill bound by registry URI resolves only through, and its operation records, which
 * the tool resolver projects a skill's tools from; no other plugin's, since a bundle reads none of theirs (D-88).
 */
const registryEntities = (activation: PluginActivation.Activation): Entity.Unknown[] => [
  // Made per invocation: `make()` mints ids, which workerd allows only inside a request.
  ...activation.skills.map((definition) => definition.make()),
  ...activation.operationHandlers.map((handler) => Operation.serialize(handler)),
];

/** Gives the handler the plugins' capability manager, which operations that read contributed capabilities require. */
const withCapabilities = (
  handler: Operation.WithHandler<Operation.Definition.Any>,
  capabilities: CapabilityManager.CapabilityManager,
): Operation.WithHandler<Operation.Definition.Any> => ({
  ...handler,
  handler: (input: unknown) => handler.handler(input).pipe(Effect.provideService(Capability.Service, capabilities)),
});

const withTimeout = <T>(promise: Promise<T>, timeout: number): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Plugin activation timed out after ${timeout}ms`)), timeout);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
