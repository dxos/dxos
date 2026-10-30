//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Schema from 'effect/Schema';
import * as Scope from 'effect/Scope';

import * as Capability from '@dxos/app-framework/Capability';
import type * as CapabilityManager from '@dxos/app-framework/CapabilityManager';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as PluginManifest from '@dxos/app-framework/PluginManifest';
import { wrapFunctionHandler } from '@dxos/compute-runtime';
import type * as Operation from '@dxos/compute/Operation';
import * as EffectEx from '@dxos/effect/EffectEx';
import { BaseError, messageOf } from '@dxos/errors';
import { ServiceContainer, createFunctionContext } from '@dxos/functions-runtime-cloudflare';
import { DXN, SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import type { FunctionProtocol, PluginProtocol } from '@dxos/protocols';

import * as PluginActivation from './PluginActivation.ts';
import * as PluginCatalog from './PluginCatalog.ts';

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

/**
 * Hosts plugins as the main module of an EDGE plugin release.
 *
 * `makePlugins` is called inside the first request, so plugin options may read request-scoped state. The release
 * serves its primary plugin; the dependencies given are the pool its `dependsOn` closure is drawn from.
 */
/** EDGE invokes operations by their bare key (`org.example.op`); an operation's own key is a DXN (`dxn:org.example.op`). */
const operationKeyName = (key: string): string => (DXN.isDXN(key) ? DXN.getName(key) : key);

/**
 * A plugin from its bundle's `manifest.json`, the way every host builds one: each module body loads through `loaders`,
 * keyed by the URL the manifest gives it, when the module activates.
 */
export const fromManifest = (manifest: unknown, loaders: Plugin.ManifestLoaders): Plugin.Plugin => {
  const definition = PluginManifest.toDefinition(Schema.decodeUnknownSync(PluginManifest.Manifest)(manifest));
  if (definition === undefined) {
    throw new InvalidRequestError({ message: 'The plugin manifest lists no modules.' });
  }
  return Plugin.fromManifest(definition, loaders).make();
};

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

    const func = wrapFunctionHandler(withCapabilities(handler, activation.capabilities), {
      // Registering types needs a database, which exists only for a space-scoped invocation.
      types: spaceId === undefined ? undefined : [...activation.registeredTypes],
      toolkits: [...activation.toolkits],
    });

    // The in-process rpc clients bridged onto the bindings live for one invocation.
    const serviceScope = Effect.runSync(Scope.make());
    try {
      const context = await makeContext(env, scope, spaceId, serviceScope);
      return await func.handler({ context, data: request.input });
    } finally {
      await EffectEx.runPromise(Scope.close(serviceScope, Exit.void));
    }
  };

  const invoke: Host['invoke'] = async (request, env, scope = {}) => {
    try {
      return { ok: true, output: await run(request, env, scope) };
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
  ...(error instanceof Error ? { name: error.name, stack: error.stack } : {}),
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
): Promise<FunctionProtocol.Context> => {
  const { DATA_SERVICE, QUEUE_SERVICE, FUNCTIONS_AI_SERVICE } = env;
  if (DATA_SERVICE === undefined || QUEUE_SERVICE === undefined || FUNCTIONS_AI_SERVICE === undefined) {
    if (spaceId !== undefined) {
      throw new InvalidRequestError({
        message: 'A space-scoped invocation needs DATA_SERVICE, QUEUE_SERVICE and FUNCTIONS_AI_SERVICE',
      });
    }
    return { services: { accessTokenService: scope.accessTokenService } };
  }
  return createFunctionContext({
    serviceContainer: new ServiceContainer({}, DATA_SERVICE, QUEUE_SERVICE, FUNCTIONS_AI_SERVICE),
    contextSpaceId: spaceId,
    serviceScope,
    accessTokenService: scope.accessTokenService,
  });
};

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
