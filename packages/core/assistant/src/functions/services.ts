//
// Copyright 2025 DXOS.org
//

import { AiTool, type AiToolkit } from '@effect/ai';
import { Context, Effect, Layer, Record, Schema } from 'effect';

import { AiToolNotFoundError, ToolExecutionService, ToolResolverService } from '@dxos/ai';
import { todo } from '@dxos/debug';
import { Obj, Query } from '@dxos/echo';
import {
  DatabaseService,
  FunctionDefinition,
  type FunctionImplementationResolver,
  FunctionInvocationService,
  FunctionType,
  getUserFunctionIdInMetadata,
} from '@dxos/functions';
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
  toolkit: AiToolkit.Any,
): Layer.Layer<ToolResolverService, never, DatabaseService> => {
  return Layer.effect(
    ToolResolverService,
    Effect.gen(function* () {
      const dbService = yield* DatabaseService;
      return {
        resolve: (id): Effect.Effect<AiTool.Any, AiToolNotFoundError> =>
          Effect.gen(function* () {
            const tool = toolkit.tools[id];
            if (tool) {
              return tool;
            }

            const {
              objects: [dbFunction],
            } = yield* DatabaseService.runQuery(Query.type(FunctionType, { key: id }));
            const functionDeploymentId = dbFunction ? getUserFunctionIdInMetadata(Obj.getMeta(dbFunction)) : undefined;

            const functionDef = dbFunction
              ? FunctionDefinition.deserialize(dbFunction)
              : functions.find((fn) => fn.key === id);

            if (!functionDef) {
              return yield* Effect.fail(new AiToolNotFoundError(id));
            }

            return projectFunctionToTool(functionDef, { deployedFunctionId: functionDeploymentId });
          }).pipe(Effect.provideService(DatabaseService, dbService)),
      } satisfies Context.Tag.Service<ToolResolverService>;
    }),
  );
};

export const makeToolExecutionServiceFromFunctions = (
  toolkit: AiToolkit.AiToolkit<AiTool.Any>,
  handlersLayer: Layer.Layer<AiTool.ToHandler<AiTool.AiTool<any>>, never, never>,
): Layer.Layer<ToolExecutionService, never, FunctionInvocationService | FunctionImplementationResolver> => {
  return Layer.effect(
    ToolExecutionService,
    Effect.gen(function* () {
      const toolkitHandler = yield* toolkit.pipe(Effect.provide(handlersLayer));
      const functionInvocationService = yield* FunctionInvocationService;

      return {
        handlersFor: (toolkit) => {
          const makeHandler = (tool: AiTool.Any): ((params: unknown) => Effect.Effect<unknown, any, any>) => {
            return Effect.fn('toolFunctionHandler')(function* (input: any) {
              if (toolkitHandler.tools.find((t: AiTool.Any) => t.name === tool.name)) {
                // TODO(wittjosiah): Everything is `never` here.
                return yield* (toolkitHandler.handle as any)(tool.name, input);
              }

              const { definition: functionDef, deployedFunctionId } = Context.get(FunctionToolAnnotation)(
                tool.annotations as any,
              );

              return yield* functionInvocationService
                .invokeFunction(functionDef, input as any, deployedFunctionId)
                .pipe(Effect.catchAllDefect((defect) => Effect.fail(defect)));
            });
          };

          return toolkit.of(Record.map(toolkit.tools, (tool, _name) => makeHandler(tool)) as any) as any;
        },
      };
    }),
  );
};

/**
 * Tools that are projected from functions have this annotation.
 *
 * deployedFunctionId:
 * - Backend deployment ID assigned by the EDGE function service (typically a UUID).
 * - Used for remote invocation via `FunctionInvocationService` → `RemoteFunctionExecutionService`.
 * - Persisted on the corresponding ECHO `FunctionType` object's metadata under the
 *   `FUNCTIONS_META_KEY` and retrieved with `getUserFunctionIdInMetadata`.
 */
class FunctionToolAnnotation extends Context.Tag('@dxos/assistant/FunctionToolAnnotation')<
  FunctionToolAnnotation,
  { definition: FunctionDefinition<any, any>; deployedFunctionId?: string; spaceId?: string }
>() {}

const toolCache = new WeakMap<FunctionDefinition<any, any>, AiTool.Any>();

/**
 * Projects a `FunctionDefinition` into an `AiTool`.
 *
 * @param fn The function definition to project into a tool.
 * @param meta Optional projection metadata.
 * @param meta.deployedFunctionId Backend deployment ID used for remote invocation when present. This is the
 *        EDGE service's function deployment identifier (not the ECHO object ID/DXN and not `FunctionDefinition.key`).
 */
const projectFunctionToTool = (
  fn: FunctionDefinition<any, any>,
  meta?: { deployedFunctionId?: string },
): AiTool.Any => {
  if (toolCache.has(fn)) {
    return toolCache.get(fn)!;
  }

  const tool = AiTool.make(makeToolName(fn.name), {
    description: fn.description,
    parameters: createStructFieldsFromSchema(fn.inputSchema),
    // TODO(dmaretskyi): Include output schema.
    failure: Schema.Any, // TODO(dmaretskyi): Better type for the failure?
  }).annotate(FunctionToolAnnotation, { definition: fn, deployedFunctionId: meta?.deployedFunctionId });
  toolCache.set(fn, tool);
  return tool;
};

/**
 * @returns Tool name produced from function name by escaping invalid characters.
 */
const makeToolName = (name: string) => {
  const toolName = name.replace(/[^a-zA-Z0-9]/g, '_');
  invariant(toolName.match(/^[a-zA-Z_][a-zA-Z0-9-_]*$/));
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
