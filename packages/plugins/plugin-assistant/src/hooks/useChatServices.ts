//
// Copyright 2025 DXOS.org
//

import { AiTool } from '@effect/ai';
import { type Context, Effect, Layer, Match, Predicate, Record, Schema } from 'effect';
import { useMemo } from 'react';
import { useDeepCompareMemoize } from 'use-deep-compare-effect';

import { type AiService, AiToolNotFoundError, ToolExecutionService, ToolRegistry, ToolResolverService } from '@dxos/ai';
import { AiServiceTestingPreset } from '@dxos/ai/testing';
import { Capabilities, useCapabilities } from '@dxos/app-framework';
import { type Space } from '@dxos/client/echo';
import { todo } from '@dxos/debug';
import {
  ConfiguredCredentialsService,
  CredentialsService,
  DatabaseService,
  EventLogger,
  FunctionCallService,
  type FunctionContext,
  type FunctionDefinition,
  FunctionError,
  ToolResolverService as FunctionsToolResolverService,
  QueueService,
  type Services,
  TracingService,
} from '@dxos/functions';

export type UseChatServicesProps = {
  space?: Space;
};

// TODO(burdon): Deconstruct into separate layers?
export type ChatServices =
  | AiService
  | CredentialsService
  | DatabaseService
  | QueueService
  | FunctionCallService
  | ToolResolverService
  | TracingService
  | EventLogger
  | ToolResolverService
  | ToolExecutionService;

/**
 * Construct service layer.
 */
export const useChatServices = ({ space }: UseChatServicesProps): Layer.Layer<ChatServices> | undefined => {
  const toolRegistry = useToolRegistry();
  // TODO(dmaretskyi): We can provide the plugin registry as a layer and then build the entire layer stack from there. We need to think how plugin reactivity affect our layer structure.
  const toolResolver = useToolResolver();
  const toolExecutionService = useToolExecutionService();

  return useMemo(() => {
    return Layer.mergeAll(
      AiServiceTestingPreset('edge-local').pipe(Layer.orDie), // TODO(burdon): Error management?
      Layer.succeed(CredentialsService, new ConfiguredCredentialsService()),
      space ? Layer.succeed(DatabaseService, DatabaseService.make(space.db)) : DatabaseService.notAvailable,
      space ? Layer.succeed(QueueService, QueueService.make(space.queues)) : QueueService.notAvailable,
      Layer.succeed(FunctionCallService, FunctionCallService.mock()),
      Layer.succeed(TracingService, TracingService.noop),
      Layer.succeed(EventLogger, EventLogger.noop),
      Layer.succeed(ToolResolverService, toolResolver),
      Layer.succeed(ToolExecutionService, toolExecutionService),
      // TODO(dmaretskyi): Remove.
      Layer.succeed(FunctionsToolResolverService, FunctionsToolResolverService.make(toolRegistry)),
    );
  }, [space, toolRegistry, toolResolver]);
};

const useToolResolver = (): Context.Tag.Service<ToolResolverService> => {
  const functions = useCapabilities(Capabilities.Functions).flat();
  return useMemo(
    (): Context.Tag.Service<ToolResolverService> => ({
      resolve: Effect.fn('resolve')(function* (id) {
        const fn = functions.find((f) => f.name === id);
        if (!fn) {
          return yield* Effect.fail(new AiToolNotFoundError(id));
        }
        return projectFunctionToTool(fn);
      }),
    }),
    [useDeepCompareMemoize(functions.map((f) => f.name))],
  );
};

const useToolExecutionService = (): Context.Tag.Service<ToolExecutionService> => {
  const functions = useCapabilities(Capabilities.Functions).flat();
  return useMemo(
    (): Context.Tag.Service<ToolExecutionService> => ({
      handlersFor: (toolkit) => {
        const makeHandler = (tool: AiTool.Any): ((params: unknown) => Effect.Effect<unknown, any, any>) => {
          return Effect.fn('toolFunctionHandler')(function* (input: any) {
            const fnDef = functions.find((f) => f.name === tool.name);
            if (!fnDef) {
              return yield* Effect.fail(new AiToolNotFoundError(tool.name));
            }

            return yield* invokeFunction(fnDef, input).pipe(Effect.catchAllDefect((defect) => Effect.fail(defect)));
          });
        };

        return toolkit.of(Record.map(toolkit.tools, (tool, name) => makeHandler(tool)) as any) as any;
      },
    }),
    [useDeepCompareMemoize(functions.map((f) => f.name))],
  );
};

const invokeFunction = (fnDef: FunctionDefinition<any, any>, input: any): Effect.Effect<unknown, never, Services> =>
  Effect.gen(function* () {
    // Assert input matches schema
    const assertInput = fnDef.inputSchema.pipe(Schema.asserts);
    (assertInput as any)(input);

    const context: FunctionContext = {
      getService: () => todo(),
      getSpace: async (_spaceId: any) => {
        throw new Error('Not available. Use the database service instead.');
      },
      space: undefined,
      get ai(): never {
        throw new Error('Not available. Use the ai service instead.');
      },
    };

    // TODO(dmaretskyi): This should be delegated to a function invoker service.
    const data = yield* Effect.gen(function* () {
      const result = fnDef.handler({ context, data: input });
      if (Effect.isEffect(result)) {
        return yield* (result as Effect.Effect<unknown, unknown, Services>).pipe(Effect.orDie);
      } else if (
        typeof result === 'object' &&
        result !== null &&
        'then' in result &&
        typeof result.then === 'function'
      ) {
        return yield* Effect.promise(() => result);
      } else {
        return result;
      }
    }).pipe(
      Effect.orDie,
      Effect.catchAllDefect((defect) =>
        Effect.die(new FunctionError('Error running function', { context: { name: fnDef.name }, cause: defect })),
      ),
    );

    // Assert output matches schema
    const assertOutput = fnDef.outputSchema?.pipe(Schema.asserts);
    (assertOutput as any)(data);

    return data;
  }).pipe(Effect.withSpan('invokeFunction', { attributes: { name: fnDef.name } }));

const toolCache = new WeakMap<FunctionDefinition<any, any>, AiTool.Any>();
const projectFunctionToTool = (fn: FunctionDefinition<any, any>): AiTool.Any => {
  if (toolCache.has(fn)) {
    return toolCache.get(fn)!;
  }
  const tool = AiTool.make(fn.name, {
    description: fn.description,
    parameters: createStructFieldsFromSchema(fn.inputSchema),
    // TODO(dmaretskyi): Include output schema.
    failure: Schema.Any, // TODO(dmaretskyi): Better type for the failure?
  });
  toolCache.set(fn, tool);
  return tool;
};

const createStructFieldsFromSchema = (schema: Schema.Schema<any, any>): Record<string, Schema.Schema<any, any>> => {
  return Match.value(schema.ast).pipe(
    Match.when(Predicate.isTagged('TypeLiteral'), (ast) => {
      return Object.fromEntries(ast.propertySignatures.map((prop) => [prop.name, Schema.make(prop.type)]));
    }),
    Match.orElseAbsurd,
  );
};

// TODO(burdon): Factor out.
const useToolRegistry = (): ToolRegistry => {
  const tools = useCapabilities(Capabilities.Tools).flat();
  return useMemo(() => {
    const toolRegistry = new ToolRegistry([]);
    for (const tool of tools) {
      if (!toolRegistry.has(tool)) {
        toolRegistry.register(tool);
      }
    }
    return toolRegistry;
  }, [useDeepCompareMemoize(tools)]);
};
