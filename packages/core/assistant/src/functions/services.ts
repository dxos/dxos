//
// Copyright 2025 DXOS.org
//

import { AiTool } from '@effect/ai';
import { Context, Effect, Layer, Match, Predicate, Record, Schema } from 'effect';

import { AiToolNotFoundError, ToolExecutionService, ToolResolverService } from '@dxos/ai';
import { todo } from '@dxos/debug';
import { FunctionError, type FunctionContext, type FunctionDefinition, type Services } from '@dxos/functions';
import { invariant } from '@dxos/invariant';

export const makeToolResolverFromFunctions = (
  functions: FunctionDefinition<any, any>[],
): Layer.Layer<ToolResolverService> => {
  return Layer.succeed(ToolResolverService, {
    resolve: Effect.fn('resolveTool')(function* (id) {
      const fn = functions.find((f) => f.name === id);
      if (!fn) {
        return yield* Effect.fail(new AiToolNotFoundError(id));
      }
      return projectFunctionToTool(fn);
    }),
  });
};

export const makeToolExecutionServiceFromFunctions = (
  functions: FunctionDefinition<any, any>[],
): Layer.Layer<ToolExecutionService> => {
  return Layer.succeed(ToolExecutionService, {
    handlersFor: (toolkit) => {
      const makeHandler = (tool: AiTool.Any): ((params: unknown) => Effect.Effect<unknown, any, any>) => {
        return Effect.fn('toolFunctionHandler')(function* (input: any) {
          const { functionName } = Context.get(FunctionToolAnnotation)(tool.annotations as any);

          const fnDef = functions.find((f) => f.name === functionName);
          if (!fnDef) {
            return yield* Effect.fail(new AiToolNotFoundError(tool.name));
          }

          return yield* invokeFunction(fnDef, input).pipe(Effect.catchAllDefect((defect) => Effect.fail(defect)));
        });
      };

      return toolkit.of(Record.map(toolkit.tools, (tool, name) => makeHandler(tool)) as any) as any;
    },
  });
};

/**
 * Tools that are projected from functions have this annotation.
 */
class FunctionToolAnnotation extends Context.Tag('@dxos/assisatnt/FunctionToolAnnotation')<
  FunctionToolAnnotation,
  {
    functionName: string;
  }
>() {}

const toolCache = new WeakMap<FunctionDefinition<any, any>, AiTool.Any>();
const projectFunctionToTool = (fn: FunctionDefinition<any, any>): AiTool.Any => {
  if (toolCache.has(fn)) {
    return toolCache.get(fn)!;
  }
  const tool = AiTool.make(makeToolName(fn.name), {
    description: fn.description,
    parameters: createStructFieldsFromSchema(fn.inputSchema),
    // TODO(dmaretskyi): Include output schema.
    failure: Schema.Any, // TODO(dmaretskyi): Better type for the failure?
  }).annotate(FunctionToolAnnotation, { functionName: fn.name });
  toolCache.set(fn, tool);
  return tool;
};

/**
 * @returns Tool name produced from function name by escaping invalid characters.
 */
const makeToolName = (name: string) => {
  const toolName = name.replace(/[^a-zA-Z0-9]/g, '');
  invariant(toolName.match(/^[a-zA-Z_][a-zA-Z0-9-_]*$/));
  return toolName;
};

// TODO(dmaretskyi): Factor out.
const createStructFieldsFromSchema = (schema: Schema.Schema<any, any>): Record<string, Schema.Schema<any, any>> => {
  return Match.value(schema.ast).pipe(
    Match.when(Predicate.isTagged('TypeLiteral'), (ast) => {
      return Object.fromEntries(ast.propertySignatures.map((prop) => [prop.name, Schema.make(prop.type)]));
    }),
    Match.orElseAbsurd,
  );
};

// TODO(dmaretskyi): Factor out.
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
