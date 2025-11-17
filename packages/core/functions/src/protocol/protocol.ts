import { FunctionDefinition, type FunctionServices, type FunctionContext } from '../sdk';
import { type FunctionProtocol } from '@dxos/protocols';
import { Type } from '@dxos/echo';
import { CredentialsService, DatabaseService, FunctionInvocationService, TracingService } from '../services';
import { QueueService } from '../services';
import { FunctionError } from '../errors';
import { SchemaAST, Schema, Effect, Layer } from 'effect';
import { EchoClient } from '@dxos/echo-db';
import { acquireReleaseResource } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { AiService } from '@dxos/ai';

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
        (func.services.includes(DatabaseService.key) || func.services.includes(QueueService.key)) &&
        (!context.services.dataService || !context.services.queryService)
      ) {
        throw new FunctionError({
          message: 'Services not provided: dataService, queryService',
        });
      }

      try {
        if (!SchemaAST.isAnyKeyword(func.inputSchema.ast)) {
          Schema.validateSync(func.inputSchema)(data);
        }

        let result = await func.handler({
          // TODO(dmaretskyi): Fix the types.
          context: context as any,
          data,
        });

        if (Effect.isEffect(result)) {
          result = await Effect.runPromise(
            (result as Effect.Effect<unknown, unknown, FunctionServices>).pipe(
              Effect.orDie,
              Effect.provide(createServiceLayer(context)),
            ),
          );
        }

        if (func.outputSchema && !SchemaAST.isAnyKeyword(func.outputSchema.ast)) {
          Schema.validateSync(func.outputSchema)(result);
        }

        return result;
      } catch (error) {
        if (FunctionError.is(error)) {
          throw error;
        } else {
          throw new FunctionError({
            cause: error,
            context: { func: func.key },
          });
        }
      }
    },
  };
};

/**
 * Creates a layer of services for the function.
 */
const createServiceLayer = (context: FunctionProtocol.Context): Layer.Layer<FunctionServices> => {
  return Layer.unwrapScoped(
    Effect.gen(function* () {
      let client: EchoClient | undefined;

      if (context.services.dataService && context.services.queryService) {
        client = yield* acquireReleaseResource(() => {
          invariant(context.services.dataService && context.services.queryService);
          // TODO(dmaretskyi): Queues service.
          return new EchoClient().connectToService({
            dataService: context.services.dataService,
            queryService: context.services.queryService,
          });
        });
      }

      const db =
        client && context.spaceId
          ? client.constructDatabase({
              spaceId: context.spaceId,
              spaceKey: PublicKey.ZERO, // TODO(dmaretskyi): This will likely result in objects being created
              reactiveSchemaQuery: false,
            })
          : undefined;

      const queues = client && context.spaceId ? client.constructQueueFactory(context.spaceId) : undefined;

      const dbLayer = db ? DatabaseService.layer(db) : DatabaseService.notAvailable;
      const queuesLayer = queues ? QueueService.layer(queues) : QueueService.notAvailable;
      const credentials = dbLayer
        ? CredentialsService.layerFromDatabase().pipe(Layer.provide(dbLayer))
        : CredentialsService.configuredLayer([]);
      const functionInvocationService = MockedFunctionInvocationService;
      const aiService = AiService.notAvailable;
      const tracing = TracingService.layerNoop;

      return Layer.mergeAll(dbLayer, queuesLayer, credentials, functionInvocationService, aiService, tracing);
    }),
  );
};

const MockedFunctionInvocationService = Layer.succeed(FunctionInvocationService, {
  invokeFunction: () => Effect.die('Calling functions from functions is not implemented yet.'),
});
