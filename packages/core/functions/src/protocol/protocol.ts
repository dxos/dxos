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
import { Database, Type } from '@dxos/echo';
import { EchoClient, type EchoDatabaseImpl, type QueueFactory } from '@dxos/echo-db';
import { runAndForwardErrors } from '@dxos/effect';
import { assertState, failedInvariant, invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { type FunctionProtocol } from '@dxos/protocols';

import { FunctionError } from '../errors';
import { FunctionDefinition, type FunctionServices } from '../sdk';
import { CredentialsService, FunctionInvocationService, QueueService, TracingService } from '../services';

import { FunctionsAiHttpClient } from './functions-ai-http-client';

/**
 * Wraps a function handler made with `defineFunction` to a protocol that the functions-runtime expects.
 */
export const wrapFunctionHandler = (func: FunctionDefinition): FunctionProtocol.Func => {
  if (!FunctionDefinition.isFunction(func)) {
    throw new TypeError('Invalid function definition');
  }

  return {
    meta: {
      key: func.key,
      name: func.name,
      description: func.description,
      inputSchema: Type.toJsonSchema(func.inputSchema),
      outputSchema: func.outputSchema === undefined ? undefined : Type.toJsonSchema(func.outputSchema),
      services: func.services,
    },
    handler: async ({ data, context }) => {
      if (
        (func.services.includes(Database.Service.key) || func.services.includes(QueueService.key)) &&
        (!context.services.dataService || !context.services.queryService)
      ) {
        throw new FunctionError({
          message: 'Services not provided: dataService, queryService',
        });
      }

      // eslint-disable-next-line no-useless-catch
      try {
        if (!SchemaAST.isAnyKeyword(func.inputSchema.ast)) {
          try {
            Schema.validateSync(func.inputSchema)(data);
          } catch (error) {
            throw new FunctionError({ message: 'Invalid input schema', cause: error });
          }
        }

        await using funcContext = await new FunctionContext(context).open();

        if (func.types.length > 0) {
          invariant(funcContext.db, 'Database is required for functions with types');
          await funcContext.db.graph.schemaRegistry.register(func.types as Type.Entity.Any[]);
        }

        let result = await func.handler({
          // TODO(dmaretskyi): Fix the types.
          context: context as any,
          data,
        });

        if (Effect.isEffect(result)) {
          result = await runAndForwardErrors(
            (result as Effect.Effect<unknown, unknown, FunctionServices>).pipe(
              Effect.orDie,
              Effect.provide(funcContext.createLayer()),
            ),
          );
        }

        if (func.outputSchema && !SchemaAST.isAnyKeyword(func.outputSchema.ast)) {
          Schema.validateSync(func.outputSchema)(result);
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

    const dbLayer = this.db ? Database.Service.layer(this.db) : Database.Service.notAvailable;
    const queuesLayer = this.queues ? QueueService.layer(this.queues) : QueueService.notAvailable;
    const credentials = dbLayer
      ? CredentialsService.layerFromDatabase().pipe(Layer.provide(dbLayer))
      : CredentialsService.configuredLayer([]);
    const functionInvocationService = MockedFunctionInvocationService;
    const tracing = TracingService.layerNoop;

    const aiLayer = this.context.services.functionsService
      ? AiModelResolver.AiModelResolver.buildAiService.pipe(
          Layer.provide(
            AnthropicResolver.make().pipe(
              Layer.provide(
                AnthropicClient.layer({
                  // TODO(dmaretskyi): Read endpoint from config/settings.
                  apiUrl: 'https://ai-service.dxos.workers.dev/provider/anthropic',
                }).pipe(Layer.provide(FunctionsAiHttpClient.layer(this.context.services.functionsService))),
              ),
            ),
          ),
        )
      : AiService.notAvailable;

    return Layer.mergeAll(
      dbLayer, //
      queuesLayer,
      credentials,
      functionInvocationService,
      aiLayer,
      tracing,
    );
  }
}

const MockedFunctionInvocationService = Layer.succeed(FunctionInvocationService, {
  invokeFunction: () => Effect.die('Calling functions from functions is not implemented yet.'),
});
