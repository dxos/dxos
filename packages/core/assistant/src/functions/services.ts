//
// Copyright 2025 DXOS.org
//

import { AiTool } from '@effect/ai';
import { Context, Effect, Layer, Match, Predicate, Record, Schema } from 'effect';

import { AiToolNotFoundError, ToolExecutionService, ToolResolverService } from '@dxos/ai';
import { LocalFunctionExecutionService, type FunctionDefinition } from '@dxos/functions';
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
): Layer.Layer<ToolExecutionService, never, LocalFunctionExecutionService> => {
  return Layer.effect(
    ToolExecutionService,
    Effect.gen(function* () {
      const localFunctionExecutionService = yield* LocalFunctionExecutionService;
      return {
        handlersFor: (toolkit) => {
          const makeHandler = (tool: AiTool.Any): ((params: unknown) => Effect.Effect<unknown, any, any>) => {
            return Effect.fn('toolFunctionHandler')(function* (input: any) {
              const { functionName } = Context.get(FunctionToolAnnotation)(tool.annotations as any);
              const fnDef = functions.find((f) => f.name === functionName);
              if (!fnDef) {
                return yield* Effect.fail(new AiToolNotFoundError(tool.name));
              }

              return yield* localFunctionExecutionService
                .invokeFunction(fnDef, input)
                .pipe(Effect.catchAllDefect((defect) => Effect.fail(defect)));
            });
          };

          return toolkit.of(Record.map(toolkit.tools, (tool, name) => makeHandler(tool)) as any) as any;
        },
      };
    }),
  );
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
