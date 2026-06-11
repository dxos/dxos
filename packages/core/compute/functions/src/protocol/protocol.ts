//
// Copyright 2025 DXOS.org
//

import * as AnthropicClient from '@effect/ai-anthropic/AnthropicClient';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';

import { AiModelResolver, AiService, OpaqueToolkit } from '@dxos/ai';
import { AnthropicResolver } from '@dxos/ai/resolvers';
import {
  FunctionError,
  Header,
  InvalidOperationInputError,
  InvalidOperationOutputError,
  Operation,
  Trace,
} from '@dxos/compute';
import { LifecycleState, Resource } from '@dxos/context';
import { Database, Feed, JsonSchema, Ref, Registry, type Type } from '@dxos/echo';
import {
  createFeedServiceLayer,
  EchoClient,
  type EchoDatabaseImpl,
  makeRegistry,
  type QueueFactory,
} from '@dxos/echo-client';
import { refFromEncodedReference } from '@dxos/echo/internal';
import { EffectEx } from '@dxos/effect';
import { assertState, failedInvariant, invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { EdgeFunctionEnv, ErrorCodec, type FunctionProtocol, type TraceProtocol } from '@dxos/protocols';

import { type FunctionServices } from '../sdk';
import { configuredCredentialsLayer, credentialsLayerFromDatabase, FunctionInvocationService } from '../services';
import { FunctionsAiHttpClient } from './functions-ai-http-client';

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
        (serviceTags.includes(Database.Service.key) || serviceTags.includes(Feed.FeedService.key)) &&
        (!context.services.dataService || !context.services.queryService)
      ) {
        throw new FunctionError({
          message: 'Services not provided: dataService, queryService',
        });
      }

      // eslint-disable-next-line no-useless-catch
      try {
        if (!SchemaAST.isAnyKeyword(func.input.ast)) {
          try {
            Schema.validateSync(func.input, { onExcessProperty: 'error' })(data);
          } catch (error: any) {
            throw new InvalidOperationInputError({
              message: `Operation input did not match schema (${func.meta.key}): ${error.message}`,
              cause: error,
            });
          }
        }

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

        let result: any = await func.handler(dataWithDecodedRefs);

        if (Effect.isEffect(result)) {
          result = await EffectEx.runAndForwardErrors(
            (result as Effect.Effect<unknown, unknown, FunctionServices>).pipe(
              Effect.orDie,
              Effect.provide(funcContext.createLayer()),
            ),
          );
        }

        // Flush in-memory ECHO writes before the function scope closes.
        // Writes performed by `db.add` / `db.remove` are buffered in the in-memory
        // `EchoDatabaseImpl` and only pushed across the `DataService` binding when
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
            Schema.validateSync(func.output, { onExcessProperty: 'error' })(result);
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
 */
class FunctionContext extends Resource {
  readonly context: FunctionProtocol.Context;
  readonly client: EchoClient | undefined;
  db: EchoDatabaseImpl | undefined;
  queues: QueueFactory | undefined;
  readonly opts: FunctionWrappingOptions;

  constructor(context: FunctionProtocol.Context, opts: FunctionWrappingOptions) {
    super();
    this.context = context;
    this.opts = opts;
    if (context.services.dataService && context.services.queryService) {
      this.client = new EchoClient().connectToService({
        dataService: context.services.dataService,
        queryService: context.services.queryService,
        queueService: context.services.queueService,
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
    this.queues =
      this.client && this.context.spaceId ? this.client.constructQueueFactory(this.context.spaceId) : undefined;
  }

  override async _close() {
    await this.db?.close();
    await this.client?.close();
  }

  createLayer(): Layer.Layer<FunctionServices> {
    assertState(this._lifecycleState === LifecycleState.OPEN, 'FunctionContext is not open');

    const dbLayer = this.db ? Database.layer(this.db) : Database.notAvailable;
    const feedLayer = this.queues ? createFeedServiceLayer(this.queues) : Feed.notAvailable;
    const credentials = dbLayer
      ? credentialsLayerFromDatabase({ caching: true }).pipe(Layer.provide(dbLayer))
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
      feedLayer,
      credentials,
      operationServiceLayer,
      aiLayer,
      OpaqueToolkit.providerLayer(OpaqueToolkit.merge(...(this.opts.toolkits ?? []))),
      traceWriterLayer,
      registryLayer,

      // `FunctionInvocationService` is deprecated; new code should yield `Operation.Service`.
      // The cloudflare wrapper provides only the unavailable layer to satisfy the (still-present)
      // type union — handlers that yield it will die at invocation time.
      FunctionInvocationService.layerNotAvailable,
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
  return AiModelResolver.AiModelResolver.buildAiService.pipe(Layer.provide(resolver));
};

/**
 * Backs `Operation.Service` with the EDGE-provided `FunctionsService` so that operation
 * handlers can invoke other deployed operations remotely. The `deployedId` on the operation
 * definition is used as the routing key.
 */
const makeOperationServiceLayer = (
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
      // services (e.g. `AiContext.Service`) needed by operations like `GetContext`.
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
        invariant(op.meta.deployedId, `Operation '${op.meta.key}' has no deployedId; cannot schedule remotely.`);
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
  schedule: () => Effect.die('Operation.Service is not available: missing functionsService in EDGE context.'),
  invokePromise: async () => ({
    error: new Error('Operation.Service is not available: missing functionsService in EDGE context.'),
  }),
} as Operation.OperationService);

const decodeRefsFromSchema = (ast: SchemaAST.AST, value: unknown, db: EchoDatabaseImpl): unknown => {
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
    case 'TypeLiteral': {
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

    case 'TupleType': {
      if (!Array.isArray(value)) {
        return value;
      }

      // For arrays, effect uses TupleType with empty elements and a single rest element.
      if (encoded.elements.length === 0 && encoded.rest.length === 1) {
        const elementType = encoded.rest[0].type;
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
      return decodeRefsFromSchema(encoded.f(), value, db);
    }

    case 'Refinement': {
      return decodeRefsFromSchema(encoded.from, value, db);
    }

    default: {
      return value;
    }
  }
};
