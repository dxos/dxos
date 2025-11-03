//
// Copyright 2025 DXOS.org
//

import * as Tool from '@effect/ai/Tool';
import type * as Toolkit from '@effect/ai/Toolkit';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Record from 'effect/Record';
import * as Schema from 'effect/Schema';

import { AiToolNotFoundError, ToolExecutionService, ToolResolverService } from '@dxos/ai';
import { todo } from '@dxos/debug';
import { Query } from '@dxos/echo';
import { DatabaseService, Function, FunctionDefinition, FunctionInvocationService } from '@dxos/functions';
import { invariant } from '@dxos/invariant';

/**
 * Constructs a `ToolResolverService` whose `resolve(id)` looks up tools in the following order:
 *  1. Toolkit: return an existing tool from the provided `toolkit` if one is present under `id`.
 *  2. Functions in DB: query `FunctionType` by `key=id`; if found, deserialize and project to a tool
 *     (propagating any `deployedFunctionId` discovered in the object's metadata).
 *  3. Functions passed in: fall back to a matching `FunctionDefinition` from the `functions` array.
 *
 * If none of the above yield a match, the effect fails with `AiToolNotFoundError`.
 *
 * Requires `DatabaseService` in the environment.
 */
export const makeToolResolverFromFunctions = (
  functions: FunctionDefinition<any, any>[],
  toolkit: Toolkit.Toolkit<any>,
): Layer.Layer<ToolResolverService, never, DatabaseService> =>
  Layer.effect(
    ToolResolverService,
    Effect.gen(function* () {
      const dbService = yield* DatabaseService;
      return {
        resolve: (id): Effect.Effect<Tool.Any, AiToolNotFoundError> =>
          Effect.gen(function* () {
            const tool = toolkit.tools[id];
            if (tool) {
              return tool;
            }

            const {
              objects: [dbFunction],
            } = yield* DatabaseService.runQuery(Query.type(Function.Function, { key: id }));

            const functionDef = dbFunction
              ? FunctionDefinition.deserialize(dbFunction)
              : functions.find((fn) => fn.key === id);

            if (!functionDef) {
              return yield* Effect.fail(new AiToolNotFoundError(id));
            }

            return projectFunctionToTool(functionDef);
          }).pipe(Effect.provideService(DatabaseService, dbService)),
      } satisfies Context.Tag.Service<ToolResolverService>;
    }),
  );

export const makeToolExecutionServiceFromFunctions = (
  toolkit: Toolkit.Toolkit<any>,
  handlersLayer: Layer.Layer<Tool.Handler<any>, never, never>,
): Layer.Layer<ToolExecutionService, never, FunctionInvocationService> =>
  Layer.effect(
    ToolExecutionService,
    Effect.gen(function* () {
      const toolkitHandler = yield* toolkit.pipe(Effect.provide(handlersLayer));
      invariant(isHandlerLike(toolkitHandler));
      const functionInvocationService = yield* FunctionInvocationService;

      return {
        handlersFor: (toolkit) => {
          const makeHandler = (tool: Tool.Any): ((params: unknown) => Effect.Effect<unknown, any, any>) =>
            Effect.fn(`toolFunctionHandler ${tool.name}`)(function* (input: any) {
              if (toolkitHandler.tools[tool.name]) {
                if (Tool.isProviderDefined(tool)) {
                  throw new Error('Attempted to call a provider-defined tool');
                }
                // TODO(wittjosiah): Everything is `never` here.
                return yield* (toolkitHandler.handle as any)(tool.name, input);
              }

              const { definition: functionDef } = Context.get(FunctionToolAnnotation)(tool.annotations as any);

              return yield* functionInvocationService
                .invokeFunction(functionDef, input as any)
                .pipe(Effect.catchAllDefect((defect) => Effect.fail(defect)));
            });

          return toolkit.of(
            Record.map(toolkit.tools, (tool, _name) => (Tool.isUserDefined(tool) ? makeHandler(tool) : null)) as any,
          ) as any;
        },
      };
    }),
  );

class FunctionToolAnnotation extends Context.Tag('@dxos/assistant/FunctionToolAnnotation')<
  FunctionToolAnnotation,
  { definition: FunctionDefinition<any, any> }
>() {}

const toolCache = new WeakMap<FunctionDefinition<any, any>, Tool.Any>();

/**
 * Projects a `FunctionDefinition` into an `AiTool`.
 *
 * @param fn The function definition to project into a tool.
 * @param meta Optional projection metadata.
 * @param meta.deployedFunctionId Backend deployment ID used for remote invocation when present.
 *    This is the EDGE service's function deployment identifier (not the ECHO object ID/DXN and not `FunctionDefinition.key`).
 */
const projectFunctionToTool = (fn: FunctionDefinition<any, any>): Tool.Any => {
  if (toolCache.has(fn)) {
    return toolCache.get(fn)!;
  }

  // TODO(burdon): Use and map function.key?
  const tool = Tool.make(makeToolName(fn.name), {
    description: fn.description,
    parameters: createStructFieldsFromSchema(fn.inputSchema),
    // TODO(dmaretskyi): Include output schema.
    failure: Schema.Any, // TODO(dmaretskyi): Better type for the failure?
  }).annotate(FunctionToolAnnotation, { definition: fn });
  toolCache.set(fn, tool);
  return tool;
};

/**
 * @returns Tool name produced from function name by escaping invalid characters.
 */
const makeToolName = (name: string) => {
  const toolName = name.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-');
  invariant(toolName.match(/^[a-z_][a-z0-9-_]*$/));
  return toolName;
};

// TODO(dmaretskyi): Factor out.
const createStructFieldsFromSchema = (schema: Schema.Schema<any, any>): Record<string, Schema.Schema<any, any>> => {
  switch (schema.ast._tag) {
    case 'TypeLiteral':
      return Object.fromEntries(schema.ast.propertySignatures.map((prop) => [prop.name, Schema.make(prop.type)]));
    case 'VoidKeyword':
      return {};
    default:
      return todo(`Unsupported schema AST: ${schema.ast._tag}`);
  }
};

const isHandlerLike = (value: unknown): value is Toolkit.WithHandler<Record<string, Tool.Any>> =>
  typeof (value as any).tools === 'object' && typeof (value as any).handle === 'function';
