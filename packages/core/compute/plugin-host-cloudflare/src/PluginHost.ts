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
import { wrapFunctionHandler } from '@dxos/compute-runtime';
import type * as Operation from '@dxos/compute/Operation';
import * as EffectEx from '@dxos/effect/EffectEx';
import { BaseError, messageOf } from '@dxos/errors';
import {
  FUNCTION_ROUTE_HEADER,
  FunctionRouteValue,
  ServiceContainer,
  createFunctionContext,
} from '@dxos/functions-runtime-cloudflare';
import { DXN, SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { EdgeResponse } from '@dxos/protocols';
import type { EdgeFunctionEnv, FunctionProtocol } from '@dxos/protocols';

import * as PluginActivation from './PluginActivation.ts';
import * as PluginCatalog from './PluginCatalog.ts';

/** Names the operation a fetch invocation runs; the rest of the request is the functions protocol's. */
export const OPERATION_KEY_HEADER = 'X-DXOS-Operation';

/**
 * The bindings compute-service hands a release. They are the same for every space and caller, so one isolate serves
 * them all; all optional, since an invocation outside a space, or a test, runs without them.
 */
export type Env = Partial<Pick<EdgeFunctionEnv.Env, 'DATA_SERVICE' | 'QUEUE_SERVICE' | 'FUNCTIONS_AI_SERVICE'>>;

/** One invocation. */
export type InvokeRequest = {
  readonly operationKey: string;
  readonly input?: unknown;
  readonly spaceId?: string;
};

/** What differs between two calls to the same isolate, passed with each call rather than in `env`. */
export type InvocationScope = {
  /** Mints the caller's credentials; bound by compute-service to this caller and space. */
  readonly accessTokenService?: EdgeFunctionEnv.AccessTokenService;
};

export class OperationNotFoundError extends BaseError.extend('OperationNotFoundError', 'Operation not found') {}

export class InvalidRequestError extends BaseError.extend('InvalidRequestError', 'Invalid plugin host request') {}

/** The host of one release's plugins. */
export interface Host {
  /** The release's catalog. */
  describe(): Promise<PluginCatalog.Catalog>;
  /** Runs an operation and returns its output; rejects with the handler's error. */
  invoke(request: InvokeRequest, env: Env, scope?: InvocationScope): Promise<unknown>;
  /**
   * The functions protocol compute-service uses for Worker Loader functions: the `meta` route header returns the
   * catalog; any other request invokes the operation named by {@link OPERATION_KEY_HEADER} with the JSON body
   * `{ data }`, in the space of the `spaceId` query parameter, answering with an {@link EdgeResponse} envelope.
   */
  fetch(request: Request, env: Env & Pick<Partial<EdgeFunctionEnv.Env>, 'ACCESS_TOKEN_SERVICE'>): Promise<Response>;
}

export type Options = {
  /** Bound on plugin activation; past it the activation is abandoned so the next request can retry. */
  readonly activationTimeout?: number;
};

const DEFAULT_ACTIVATION_TIMEOUT = 20_000;

/** The functions protocol's invocation body. */
const decodeBody = Schema.decodeUnknownSync(Schema.Struct({ data: Schema.optional(Schema.Unknown) }));

/**
 * Hosts plugins as the main module of an EDGE plugin release.
 *
 * `makePlugins` is called inside the first request, so plugin options may read request-scoped state. The release
 * serves its primary plugin; the dependencies given are the pool its `dependsOn` closure is drawn from.
 */
/** EDGE invokes operations by their bare key (`org.example.op`); an operation's own key is a DXN (`dxn:org.example.op`). */
const operationKeyName = (key: string): string => (DXN.isDXN(key) ? DXN.getName(key) : key);

export const make = (makePlugins: () => PluginActivation.Plugins, options: Options = {}): Host => {
  const getActivation = memoizeActivation(makePlugins, options.activationTimeout ?? DEFAULT_ACTIVATION_TIMEOUT);

  const describe = async () => PluginCatalog.make(await getActivation());

  const invoke = async (request: InvokeRequest, env: Env, scope: InvocationScope = {}) => {
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

  const fetch: Host['fetch'] = async (request, env) => {
    try {
      if (request.headers.get(FUNCTION_ROUTE_HEADER) === FunctionRouteValue.Meta) {
        return Response.json(await describe());
      }
      const operationKey = request.headers.get(OPERATION_KEY_HEADER);
      if (!operationKey) {
        return EdgeResponse.failure({ message: `Missing ${OPERATION_KEY_HEADER} header`, status: 400 });
      }
      const { data } = decodeBody(await request.json());
      const output = await invoke(
        { operationKey, input: data, spaceId: new URL(request.url).searchParams.get('spaceId') ?? undefined },
        env,
        { accessTokenService: env.ACCESS_TOKEN_SERVICE },
      );
      return EdgeResponse.success(output);
    } catch (error) {
      log.error('plugin host request failed', { error });
      return EdgeResponse.failure({
        message: messageOf(error) ?? 'Internal error',
        error: error instanceof Error ? error : undefined,
        status: statusOf(error),
      });
    }
  };

  return { describe, invoke, fetch };
};

const statusOf = (error: unknown): number =>
  error instanceof OperationNotFoundError ? 404 : error instanceof InvalidRequestError ? 400 : 500;

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
  env: Env,
  scope: InvocationScope,
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
