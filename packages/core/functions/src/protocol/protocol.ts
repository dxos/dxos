//
// Copyright 2025 DXOS.org
//

import * as AnthropicClient from '@effect/ai-anthropic/AnthropicClient';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';

import { AiModelResolver, AiService } from '@dxos/ai';
import { AnthropicResolver } from '@dxos/ai/resolvers';
import { LifecycleState, Resource } from '@dxos/context';
import { Database, Feed, JsonSchema, Ref, type Type } from '@dxos/echo';
import { refFromEncodedReference } from '@dxos/echo/internal';
import { EchoClient, type EchoDatabaseImpl, type QueueFactory, createFeedServiceLayer } from '@dxos/echo-db';
import { runAndForwardErrors } from '@dxos/effect';
import { assertState, failedInvariant, invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { type FunctionProtocol } from '@dxos/protocols';

import { FunctionError } from '../errors';
import { type FunctionServices } from '../sdk';
import { CredentialsService, FunctionInvocationService, QueueService, TracingService } from '../services';
import * as Trace from '../Trace';
import { Operation } from '@dxos/operation';

import { FunctionsAiHttpClient } from './functions-ai-http-client';

/**
 * Wraps a function handler made with `defineFunction` to a protocol that the functions-runtime expects.
 */
export const wrapFunctionHandler = (func: Operation.WithHandler<Operation.Definition.Any>): FunctionProtocol.Func => {
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
        (serviceTags.includes(Database.Service.key) ||
          serviceTags.includes(QueueService.key) ||
          serviceTags.includes(Feed.FeedService.key)) &&
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
            Schema.validateSync(func.input)(data);
          } catch (error) {
            throw new FunctionError({ message: 'Invalid input schema', cause: error });
          }
        }

        await using funcContext = await new FunctionContext(context).open();

        if (func.types.length > 0) {
          invariant(funcContext.db, 'Database is required for functions with types');
          await funcContext.db.graph.schemaRegistry.register(func.types as Type.AnyEntity[]);
        }

        const dataWithDecodedRefs =
          funcContext.db && !SchemaAST.isAnyKeyword(func.input.ast)
            ? decodeRefsFromSchema(func.input.ast, data, funcContext.db)
            : data;

        let result: any = await func.handler(dataWithDecodedRefs);

        if (Effect.isEffect(result)) {
          result = await runAndForwardErrors(
            (result as Effect.Effect<unknown, unknown, FunctionServices>).pipe(
              Effect.orDie,
              Effect.provide(funcContext.createLayer()),
            ),
          );
        }

        if (func.output && !SchemaAST.isAnyKeyword(func.output.ast)) {
          Schema.validateSync(func.output)(result);
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

  constructor(context: FunctionProtocol.Context) {
    super();
    this.context = context;
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
    const queuesLayer = this.queues ? QueueService.layer(this.queues) : QueueService.notAvailable;
    const feedLayer = this.queues ? createFeedServiceLayer(this.queues) : Feed.notAvailable;
    const credentials = dbLayer
      ? CredentialsService.layerFromDatabase({ caching: true }).pipe(Layer.provide(dbLayer))
      : CredentialsService.configuredLayer([]);
    const functionInvocationService = MockedFunctionInvocationService;
    const tracing = TracingService.layerNoop;

    const aiLayer = this.context.services.functionsAiService
      ? AiModelResolver.AiModelResolver.buildAiService.pipe(
          Layer.provide(
            AnthropicResolver.make().pipe(
              Layer.provide(
                AnthropicClient.layer({
                  // Note: It doesn't matter what is base url here, it will be proxied to ai gateway in edge.
                  apiUrl: 'http://internal/provider/anthropic',
                }).pipe(Layer.provide(FunctionsAiHttpClient.layer(this.context.services.functionsAiService))),
              ),
            ),
          ),
        )
      : AiService.notAvailable;

    return Layer.mergeAll(
      dbLayer,
      queuesLayer,
      feedLayer,
      credentials,
      functionInvocationService,
      aiLayer,
      tracing,
      // TODO(dmaretskyi): Forward trace events.
      Trace.writerLayerNoop,
    );
  }
}

const MockedFunctionInvocationService = Layer.succeed(FunctionInvocationService, {
  invokeFunction: () => Effect.die('Calling functions from functions is not implemented yet.'),
  resolveFunction: () => Effect.die('Not implemented.'),
});

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
