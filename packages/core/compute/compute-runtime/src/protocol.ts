//
// Copyright 2025 DXOS.org
//

import * as AnthropicClient from '@effect/ai-anthropic/AnthropicClient';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';

import { AiModelResolver, AiService, OpaqueToolkit } from '@dxos/ai';
import { AnthropicResolver } from '@dxos/ai/resolvers';
import { FunctionError, InvalidOperationInputError, InvalidOperationOutputError } from '@dxos/compute';
import * as Credential from '@dxos/compute/Credential';
import * as Header from '@dxos/compute/Header';
import * as Operation from '@dxos/compute/Operation';
import * as Trace from '@dxos/compute/Trace';
import { LifecycleState, Resource } from '@dxos/context';
import { Database, JsonSchema, Ref, Registry, type Type } from '@dxos/echo';
import { type DatabaseImpl, EchoClient, makeRegistry } from '@dxos/echo-client';
import { refFromEncodedReference } from '@dxos/echo/internal';
import { EffectEx, SchemaAST } from '@dxos/effect';
import { assertState, failedInvariant, invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { EdgeFunctionEnv, ErrorCodec, type FunctionProtocol, type TraceProtocol } from '@dxos/protocols';

import { FunctionsAiHttpClient } from './functions-ai-http-client';
import {
  accessTokenResolverFromService,
  configuredCredentialsLayer,
  createS3Host,
  credentialsLayerFromDatabase,
} from './services';

/**
 * Services provided to invoked function handlers in the EDGE runtime.
 * Handlers reach other operations via `Operation.Service` (backed by the EDGE
 * `FunctionsService`); remote dispatch is keyed by the operation's `deployedId`.
 */
export type EdgeFunctionServices =
  | AiService.AiService
  | Credential.CredentialsService
  | Database.Service
  | Trace.TraceService
  | Operation.Service
  | Registry.Service
  // Provided by `FunctionContext.createLayer`, so a consumer that requires it (e.g. `AgentProcess`)
  // is satisfied by the same layer rather than having to merge its own provider.
  | OpaqueToolkit.OpaqueToolkitProvider;

export interface FunctionWrappingOptions {
  /**
   * Additional types to register with the database.
   */
  types?: Type.AnyEntity[];

  /**
   * Toolkits to make available via the `OpaqueToolkitProvider`.
   */
  toolkits?: OpaqueToolkit.OpaqueToolkit[];
}

/**
 * Wraps a function handler made with `defineFunction` to a protocol that the functions-runtime expects.
 */
export const wrapFunctionHandler = (
  func: Operation.WithHandler<Operation.Definition.Any>,
  opts: FunctionWrappingOptions = {},
): FunctionProtocol.Func => {
  if (!Operation.isOperationWithHandler(func)) {
    throw new TypeError('Expected operation with handler');
  }

  const serviceTags = func.services.map((service) => service.key);

  return {
    meta: {
      key: func.meta.key,
      name: func.meta.name,
      description: func.meta.description,
      inputSchema: JsonSchema.toJsonSchema(func.input),
      outputSchema: func.output === undefined ? undefined : JsonSchema.toJsonSchema(func.output),
      services: func.services.map((service) => service.key),
    },
    handler: async ({ data, context }) => {
      if (
        serviceTags.includes(Database.Service.key) &&
        (!context.services.dataService || !context.services.queryService)
      ) {
        throw new FunctionError({
          message: 'Services not provided: dataService, queryService',
        });
      }

      // eslint-disable-next-line no-useless-catch
      try {
        await using funcContext = await new FunctionContext(context, opts).open();

        const types = [...(opts.types ?? []), ...(func.types ?? [])];
        if (types.length > 0) {
          invariant(funcContext.db, 'Database is required for functions with types');
          funcContext.db.graph.registry.add(types);
        }

        const dataWithDecodedRefs =
          funcContext.db && !SchemaAST.isAnyKeyword(func.input.ast)
            ? decodeRefsFromSchema(func.input.ast, data, funcContext.db)
            : data;

        // Validated after ref hydration: the type side of a `Ref` field admits only a `Ref`
        // instance, and callers send the encoded `{'/': dxn}` form.
        if (!SchemaAST.isAnyKeyword(func.input.ast)) {
          try {
            Schema.decodeUnknownSync(Schema.toType(func.input), { onExcessProperty: 'error' })(dataWithDecodedRefs);
          } catch (error: any) {
            throw new InvalidOperationInputError({
              message: `Operation input did not match schema (${func.meta.key}): ${error.message}`,
              cause: error,
            });
          }
        }

        let result: any = await func.handler(dataWithDecodedRefs);

        if (Effect.isEffect(result)) {
          result = await EffectEx.runAndForwardErrors(
            (result as Effect.Effect<unknown, unknown, EdgeFunctionServices>).pipe(
              Effect.orDie,
              Effect.provide(funcContext.createLayer()),
            ),
          );
        }

        // Flush in-memory ECHO writes before the function scope closes.
        // Writes performed by `db.add` / `db.remove` are buffered in the in-memory
        // `DatabaseImpl` and only pushed across the `DataService` binding when
        // `db.flush({ disk })` is called. `FunctionContext._close` (invoked by the
        // `await using` above) calls `db.close()` but does NOT flush, so mutations
        // performed by handlers that declare `Database.Service` (e.g. `object-create`,
        // `object-update`, `relation-create`) would be silently dropped before reaching
        // the edge `AutomergeReplicator`. Flushing here closes that hole.
        if (serviceTags.includes(Database.Service.key) && funcContext.db) {
          await funcContext.db.flush({ disk: true, indexes: false });
        }

        if (func.output && !SchemaAST.isAnyKeyword(func.output.ast)) {
          try {
            Schema.decodeUnknownSync(Schema.toType(func.output), { onExcessProperty: 'error' })(result);
          } catch (error: any) {
            throw new InvalidOperationOutputError({
              message: `Operation output did not match schema (${func.meta.key}): ${error.message}`,
              cause: error,
            });
          }
        }

        return result;
      } catch (error) {
        // TODO(dmaretskyi): We might do error wrapping here and add extra context.
        throw error;
      }
    },
  };
};

/**
 * Container for services and context for a function.
 *
 * Exported because a hosted `Process` needs the same set: the EDGE process host assembles this
 * against its own bindings rather than rebuilding the layer stack, which is how the two runtimes stay
 * in step when a service is added.
 */
export class FunctionContext extends Resource {
  readonly context: FunctionProtocol.Context;
  readonly client: EchoClient | undefined;
  db: DatabaseImpl | undefined;
  readonly opts: FunctionWrappingOptions;
  /** Released in `_close`: this is a `Resource`, so a reopen would otherwise stack registrations. */
  #unregisterBlobBackend: (() => void) | undefined;

  constructor(context: FunctionProtocol.Context, opts: FunctionWrappingOptions) {
    super();
    this.context = context;
    this.opts = opts;
    if (context.services.dataService && context.services.queryService) {
      this.client = new EchoClient().connectToService({
        dataService: context.services.dataService,
        queryService: context.services.queryService,
        feedService: context.services.queueService,
      });
    }
  }

  override async _open() {
    await this.client?.open();
    this.db =
      this.client && this.context.spaceId
        ? this.client.constructDatabase({
            spaceId: this.context.spaceId ?? failedInvariant(),
            spaceKey: PublicKey.fromHex(this.context.spaceKey ?? failedInvariant('spaceKey missing in context')),
            reactiveSchemaQuery: false,
            preloadSchemaOnOpen: false,
          })
        : undefined;

    await this.db?.setSpaceRoot(this.context.spaceRootUrl ?? failedInvariant('spaceRootUrl missing in context'));
    await this.db?.open();

    // Register the S3 backend so a handler running here can write to a bucket the space is
    // connected to. Without it this host has inline storage only (4 MiB), and an upload would land
    // there silently rather than in the configured bucket. Nothing Cloudflare-specific is needed —
    // it is an outbound fetch to the customer's own endpoint — so this works on edge unchanged.
    //
    // Imported dynamically: `plugin-client` pulls this package into the app's eager boot graph, and
    // a static import would put the SigV4 signer there with it — for code that only ever runs
    // inside a function invocation.
    if (this.client && this.db) {
      const db = this.db;
      const { S3_BACKEND, createS3BlobBackend } = await import('@dxos/blob/s3');
      this.#unregisterBlobBackend = this.client.graph.registerBlobBackend(
        S3_BACKEND,
        createS3BlobBackend(createS3Host({ getDatabase: (spaceId) => (spaceId === db.spaceId ? db : undefined) })),
      );
    }
  }

  override async _close() {
    this.#unregisterBlobBackend?.();
    this.#unregisterBlobBackend = undefined;
    await this.db?.close();
    await this.client?.close();
  }

  createLayer(): Layer.Layer<EdgeFunctionServices> {
    assertState(this._lifecycleState === LifecycleState.OPEN, 'FunctionContext is not open');

    const dbLayer = this.db ? Database.layer(this.db) : Database.notAvailable;
    // A function context has no identity to sign a presentation with, so managed tokens resolve
    // through the space-bound EDGE binding rather than the HTTP endpoint the client uses.
    const accessTokenResolver = this.context.services.accessTokenService
      ? accessTokenResolverFromService(this.context.services.accessTokenService)
      : Credential.AccessTokenResolver.notAvailable;
    const credentials = dbLayer
      ? credentialsLayerFromDatabase({ caching: true }).pipe(Layer.provide(dbLayer), Layer.provide(accessTokenResolver))
      : configuredCredentialsLayer([]);

    const aiLayer = this.context.services.functionsAiService
      ? InternalAiServiceLayer(this.context.services.functionsAiService).pipe(Layer.provide(credentials))
      : AiService.notAvailable;

    const operationServiceLayer = this.context.services.functionsService
      ? makeOperationServiceLayer(this.context.services.functionsService)
      : unavailableOperationServiceLayer;

    const traceWriterLayer = this.context.services.traceService
      ? makeTraceWriterLayer(this.context.services.traceService)
      : Trace.writerLayerNoop;

    log('Creating function context layer', {
      traceService: !!this.context.services.traceService,
      functionsService: !!this.context.services.functionsService,
      functionsAiService: !!this.context.services.functionsAiService,
      spaceId: this.context.spaceId,
      spaceRootUrl: this.context.spaceRootUrl,
      toolkits: this.opts.toolkits?.length ?? 0,
      types: this.opts.types?.length ?? 0,
    });

    const registryLayer = this.db
      ? Layer.succeed(Registry.Service, this.db.graph.registry)
      : Layer.succeed(Registry.Service, makeRegistry());

    return Layer.mergeAll(
      dbLayer,
      credentials,
      operationServiceLayer,
      aiLayer,
      OpaqueToolkit.providerLayer(OpaqueToolkit.merge(...(this.opts.toolkits ?? []))),
      traceWriterLayer,
      registryLayer,
    );
  }
}

/**
 * Backs `Trace.TraceService` with the EDGE-provided `TraceService` so that operation
 * handlers can write trace events that are forwarded to the runtime's trace sink.
 */
const makeTraceWriterLayer = (traceService: TraceProtocol.TraceService): Layer.Layer<Trace.TraceService> =>
  Layer.succeed(Trace.TraceService, {
    write: (eventType, payload) => {
      log('Writing trace event', {
        eventType: eventType.key,
      });
      traceService.write([
        {
          key: eventType.key,
          isEphemeral: eventType.isEphemeral,
          data: payload,
        },
      ]);
    },
  });

/** Proxies Anthropic requests through the EDGE-provided `FunctionsAiService`, BYOK-wrapped. */
const InternalAiServiceLayer = (functionsAiService: EdgeFunctionEnv.FunctionsAiService) => {
  // `apiUrl` is a sentinel — the request gets re-routed by the AI gateway in EDGE.
  const httpClient = Header.byokLayer('anthropic.com').pipe(
    Layer.provide(FunctionsAiHttpClient.layer(functionsAiService)),
  );
  const anthropicClient = AnthropicClient.layer({ apiUrl: 'http://internal/provider/anthropic' }).pipe(
    Layer.provide(httpClient),
  );
  const resolver = AnthropicResolver.make().pipe(Layer.provide(anthropicClient));
  return AiModelResolver.buildAiService.pipe(Layer.provide(resolver));
};

/**
 * Backs `Operation.Service` with the EDGE-provided `FunctionsService` so that operation
 * handlers can invoke other deployed operations remotely. The `deployedId` on the operation
 * definition is used as the routing key.
 *
 * @internal Exported for testing.
 */
export const makeOperationServiceLayer = (
  functionsService: EdgeFunctionEnv.FunctionsService,
): Layer.Layer<Operation.Service> => {
  const invokeRemote = async (
    op: Operation.Definition.Any,
    input: unknown,
    options?: Operation.InvokeOptions,
  ): Promise<{ data?: unknown; error?: Error }> => {
    invariant(op.meta.deployedId, `Operation '${op.meta.key}' has no deployedId; cannot invoke remotely.`);
    const result = await functionsService.invoke(op.meta.deployedId, input, {
      spaceId: options?.spaceId,
      // Forward the conversation DXN so the remote runtime can rebuild conversation-scoped
      // services (e.g. `HarnessService`) needed by operations like `GetContext`.
      conversation: options?.conversation,
    });
    if (result._kind === 'success') {
      return { data: result.data };
    }
    return { error: ErrorCodec.decode(result.error) };
  };

  return Layer.succeed(Operation.Service, {
    invoke: ((op: Operation.Definition.Any, input: unknown, options?: Operation.InvokeOptions) =>
      Effect.tryPromise(() => invokeRemote(op, input, options)).pipe(
        Effect.orDie,
        Effect.flatMap((outcome) =>
          outcome.error ? Effect.die(outcome.error) : Effect.succeed(outcome.data as never),
        ),
      )) as Operation.OperationService['invoke'],
    schedule: ((op: Operation.Definition.Any, input: unknown, _options?: Operation.InvokeOptions) =>
      Effect.sync(() => {
        // Dropped rather than asserted: `schedule` is typed `Effect<void, never>`, so failing an
        // unroutable followup would take its caller down with it — a handler that imported a
        // definition directly (no `deployedId`, e.g. `observability.sendEvent` scheduled by
        // `space.addObject`) must not fail the operation that emitted it.
        if (!op.meta.deployedId) {
          log.warn('scheduled operation dropped: no deployedId, cannot schedule remotely', {
            key: String(op.meta.key),
          });
          return;
        }
        // Fire and forget — schedule is intentionally non-awaiting.
        void functionsService.invoke(op.meta.deployedId, input).catch(() => {
          // Swallow errors — schedule is observability-only.
        });
      })) as Operation.OperationService['schedule'],
    invokePromise: ((op: Operation.Definition.Any, input: unknown, options?: Operation.InvokeOptions) =>
      invokeRemote(op, input, options).catch((error: unknown) => ({
        error: error instanceof Error ? error : new Error(String(error)),
      }))) as Operation.OperationService['invokePromise'],
  } satisfies Operation.OperationService);
};

const unavailableOperationServiceLayer = Layer.succeed(Operation.Service, {
  invoke: () => Effect.die('Operation.Service is not available: missing functionsService in EDGE context.'),
  // Warn rather than die, for the same reason the routable variant drops unroutable followups.
  schedule: (op: Operation.Definition.Any) =>
    Effect.sync(() => {
      log.warn('scheduled operation dropped: missing functionsService in EDGE context', {
        key: String(op.meta.key),
      });
    }),
  invokePromise: async () => ({
    error: new Error('Operation.Service is not available: missing functionsService in EDGE context.'),
  }),
} as Operation.OperationService);

const decodeRefsFromSchema = (ast: SchemaAST.AST, value: unknown, db: DatabaseImpl): unknown => {
  if (value == null) {
    return value;
  }

  const encoded = SchemaAST.encodedBoundAST(ast);
  if (Ref.isRefType(encoded)) {
    if (Ref.isRef(value)) {
      return value;
    }

    if (typeof value === 'object' && value !== null && typeof (value as any)['/'] === 'string') {
      const resolver = db.graph.createRefResolver({ context: { space: db.spaceId } });
      return refFromEncodedReference(value as any, resolver);
    }

    return value;
  }

  switch (encoded._tag) {
    case 'Objects': {
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return value;
      }
      const result: Record<string, unknown> = { ...(value as any) };
      for (const prop of SchemaAST.getPropertySignatures(encoded)) {
        const key = prop.name.toString();
        if (key in result) {
          result[key] = decodeRefsFromSchema(prop.type, (result as any)[key], db);
        }
      }
      return result;
    }

    case 'Arrays': {
      if (!Array.isArray(value)) {
        return value;
      }

      // For arrays, effect uses an `Arrays` node with empty elements and a single rest element.
      if (encoded.elements.length === 0 && encoded.rest.length === 1) {
        const elementType = encoded.rest[0];
        return (value as unknown[]).map((item) => decodeRefsFromSchema(elementType, item, db));
      }

      return value;
    }

    case 'Union': {
      // Optional values are represented as union with undefined.
      const nonUndefined = encoded.types.filter((t) => !SchemaAST.isUndefinedKeyword(t));
      if (nonUndefined.length === 1) {
        return decodeRefsFromSchema(nonUndefined[0], value, db);
      }

      // For other unions we can't safely pick a branch without validating.
      return value;
    }

    case 'Suspend': {
      return decodeRefsFromSchema(encoded.thunk(), value, db);
    }

    // v4 has no `Refinement` node: a refined node IS its base node with checks attached, so the
    // cases above already match it.

    default: {
      return value;
    }
  }
};
