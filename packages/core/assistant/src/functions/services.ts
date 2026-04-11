//
// Copyright 2025 DXOS.org
//

import * as Tool from '@effect/ai/Tool';
import type * as Toolkit from '@effect/ai/Toolkit';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as Record from 'effect/Record';
import * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';

import { AiToolNotFoundError, ToolExecutionService, ToolResolverService } from '@dxos/ai';
import { GenericToolkit } from '@dxos/ai';
import { todo } from '@dxos/debug';
import { Ref } from '@dxos/echo';
import { FunctionInvocationService, FunctionNotFoundError } from '@dxos/functions';
import { invariant } from '@dxos/invariant';
import { Operation, OperationRegistry } from '@dxos/operation';

import { RefFromLLM } from '../types';

/**
 * Constructs a `ToolResolverService` whose `resolve(id)` looks up tools in the following order:
 *  1. Toolkit: return an existing tool from the provided `toolkit` if one is present under `id`.
 *  2. Operations in DB: query by `key=id`; if found, deserialize and project to a tool.
 *  3. Registered operations: fall back to a matching `Operation.Definition` from the handler set.
 *
 * If none of the above yield a match, the effect fails with `AiToolNotFoundError`.
 *
 * Requires `Database.Service` in the environment.
 *
 * @deprecated Moving to operation-based services.
 */
export const makeToolResolverFromFunctions = (): Layer.Layer<
  ToolResolverService,
  never,
  GenericToolkit.GenericToolkitProvider | FunctionInvocationService
> => {
  return Layer.effect(
    ToolResolverService,
    Effect.gen(function* () {
      const toolkitProvider = yield* GenericToolkit.GenericToolkitProvider;
      const functionInvocationService = yield* FunctionInvocationService;
      return {
        resolve: (id): Effect.Effect<Tool.Any, AiToolNotFoundError> =>
          Effect.gen(function* () {
            const toolkit = toolkitProvider.getToolkit();

            const tool = toolkit.toolkit.tools[id];
            if (tool) {
              return tool;
            }

            return yield* functionInvocationService.resolveFunction(id).pipe(
              Effect.map(projectFunctionToTool),
              Effect.catchTag('FunctionNotFound', () => Effect.fail(new AiToolNotFoundError(id))),
            );
          }),
      } satisfies Context.Tag.Service<ToolResolverService>;
    }),
  );
};

/**
 * @deprecated Moving to operation-based services.
 */
export const makeToolExecutionServiceFromFunctions = (): Layer.Layer<
  ToolExecutionService,
  never,
  FunctionInvocationService | GenericToolkit.GenericToolkitProvider
> => {
  return Layer.effect(
    ToolExecutionService,
    Effect.gen(function* () {
      const toolkitProvider = yield* GenericToolkit.GenericToolkitProvider;
      const toolkit = toolkitProvider.getToolkit();

      const toolkitHandler = yield* toolkit.toolkit.pipe(Effect.provide(toolkit.layer));
      invariant(isHandlerLike(toolkitHandler));
      const functionInvocationService = yield* FunctionInvocationService;

      return {
        handlersFor: (toolkit) => {
          const makeHandler = (tool: Tool.Any): ((params: unknown) => Effect.Effect<unknown, any, any>) => {
            return Effect.fn(`toolFunctionHandler ${tool.name}`)(function* (input: any) {
              if (toolkitHandler.tools[tool.name]) {
                if (Tool.isProviderDefined(tool)) {
                  throw new Error('Attempted to call a provider-defined tool');
                }

                // TODO(wittjosiah): Everything is `never` here.
                const { result } = yield* (toolkitHandler.handle as any)(tool.name, input);
                return result;
              }

              const functionDef = getOperationFromTool(tool).pipe(Option.getOrThrow);

              return yield* functionInvocationService
                .invokeFunction(functionDef, input as any)
                .pipe(Effect.catchAllDefect((defect) => Effect.fail(defect)));
            });
          };

          return toolkit.of(
            Record.map(toolkit.tools, (tool, _name) => (Tool.isUserDefined(tool) ? makeHandler(tool) : null)) as any,
          ) as any;
        },
      };
    }),
  );
};

export const makeToolResolverFromOperations = <R = never>({
  toolkit: extraToolkit = GenericToolkit.empty,
}: { toolkit?: GenericToolkit.GenericToolkit<never, never, R> } = {}): Layer.Layer<
  ToolResolverService,
  never,
  GenericToolkit.GenericToolkitProvider | OperationRegistry.Service | R
> => {
  return Layer.effect(
    ToolResolverService,
    Effect.gen(function* () {
      const toolkitProvider = yield* GenericToolkit.GenericToolkitProvider;
      const operationRegistry = yield* OperationRegistry.Service;
      return {
        resolve: (id): Effect.Effect<Tool.Any, AiToolNotFoundError> =>
          Effect.gen(function* () {
            const toolkit = GenericToolkit.merge(extraToolkit, toolkitProvider.getToolkit());

            const tool = toolkit.toolkit.tools[id];
            if (tool) {
              return tool;
            }

            return yield* operationRegistry.resolve(id).pipe(
              Effect.flatMap(
                Option.match({
                  onSome: (_) => Effect.succeed(projectFunctionToTool(_)),
                  onNone: () => Effect.fail(new AiToolNotFoundError(id)),
                }),
              ),
            );
          }),
      } satisfies Context.Tag.Service<ToolResolverService>;
    }),
  );
};

export const makeToolExecutionService = <E, R>(opts: {
  invoke: (tool: Tool.Any, input: unknown) => Effect.Effect<unknown>;
}): Layer.Layer<ToolExecutionService, never, GenericToolkit.GenericToolkitProvider> =>
  Layer.effect(
    ToolExecutionService,
    Effect.gen(function* () {
      const toolkitProvider = yield* GenericToolkit.GenericToolkitProvider;
      const toolkit = toolkitProvider.getToolkit();

      const toolkitHandler = yield* toolkit.toolkit.pipe(Effect.provide(toolkit.layer));
      invariant(isHandlerLike(toolkitHandler));

      return {
        handlersFor: (toolkit) => {
          const makeHandler = (tool: Tool.Any): ((params: unknown) => Effect.Effect<unknown, any, any>) => {
            return Effect.fn(`toolFunctionHandler ${tool.name}`)(function* (input: any) {
              if (toolkitHandler.tools[tool.name]) {
                if (Tool.isProviderDefined(tool)) {
                  throw new Error('Attempted to call a provider-defined tool');
                }

                // TODO(wittjosiah): Everything is `never` here.
                const { result } = yield* (toolkitHandler.handle as any)(tool.name, input);
                return result;
              }

              return yield* opts.invoke(tool, input).pipe(Effect.catchAllDefect((defect) => Effect.fail(defect)));
            });
          };

          return toolkit.of(
            Record.map(toolkit.tools, (tool, _name) => (Tool.isUserDefined(tool) ? makeHandler(tool) : null)) as any,
          ) as any;
        },
      };
    }),
  );

export const makeToolExecutionServiceFromOperationInvoker = (): Layer.Layer<
  ToolExecutionService,
  never,
  Operation.Service | GenericToolkit.GenericToolkitProvider
> => {
  return Layer.unwrapEffect(
    Effect.gen(function* () {
      const operationInvoker = yield* Operation.Service;

      return makeToolExecutionService({
        invoke: (tool, input) =>
          Effect.gen(function* () {
            const operationDef = getOperationFromTool(tool).pipe(Option.getOrThrow);

            return yield* operationInvoker.invoke(operationDef, input).pipe(Effect.orDie);
          }),
      });
    }),
  );
};

/**
 * @deprecated Bridge beetwen deprecated function invocataion service and operation services until we remove function invocation service.
 */
export const functionInvocationServiceFromOperations: Layer.Layer<
  FunctionInvocationService,
  never,
  OperationRegistry.Service | Operation.Service
> = Layer.effect(
  FunctionInvocationService,
  Effect.gen(function* () {
    const operationRegistry = yield* OperationRegistry.Service;
    const operationInvoker = yield* Operation.Service;
    return {
      invokeFunction: (operationDef, input) => operationInvoker.invoke(operationDef, input).pipe(Effect.orDie),
      resolveFunction: (key) =>
        operationRegistry.resolve(key).pipe(
          Effect.flatten,
          Effect.catchTag('NoSuchElementException', () => Effect.fail(new FunctionNotFoundError(key))),
        ),
    } satisfies Context.Tag.Service<FunctionInvocationService>;
  }),
);

export const ToolExecutionServices = Layer.mergeAll(
  makeToolResolverFromFunctions(),
  makeToolExecutionServiceFromFunctions(),
);

class FunctionToolAnnotation extends Context.Tag('@dxos/assistant/FunctionToolAnnotation')<
  FunctionToolAnnotation,
  { definition: Operation.Definition.Any }
>() {}

export const getOperationFromTool = (tool: Tool.Any): Option.Option<Operation.Definition.Any> => {
  return Context.getOption(FunctionToolAnnotation)(tool.annotations).pipe(Option.map(({ definition }) => definition));
};

const toolCache = new WeakMap<Operation.Definition.Any, Tool.Any>();

/**
 * Projects an `Operation.Definition` into an `AiTool`.
 */
const projectFunctionToTool = (fn: Operation.Definition.Any): Tool.Any => {
  if (toolCache.has(fn)) {
    return toolCache.get(fn)!;
  }

  const tool = Tool.make(makeToolName(fn.meta.name ?? fn.meta.key), {
    description: fn.meta.description,
    parameters: createStructFieldsFromSchema(fn.input),
    failure: Schema.Any,
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
      return Object.fromEntries(
        schema.ast.propertySignatures.map((prop) => [prop.name, Schema.make(mapSchemaTypeForLLM(prop.type))]),
      );
    case 'VoidKeyword':
      return {};
    default:
      return todo(`Unsupported schema AST: ${schema.ast._tag}`);
  }
};

/**
 * Picks an LLM-friendly schema type for the given schema AST.
 * The picked schema type decodes to the original schema type.
 */
const mapSchemaTypeForLLM = (ast: SchemaAST.AST): SchemaAST.AST => {
  if (Ref.isRefType(ast)) {
    const description = ast.annotations.description
      ? ast.annotations.description + '\n' + RefFromLLM.ast.annotations.description
      : (RefFromLLM.ast.annotations.description as string);
    return RefFromLLM.annotations({ description }).ast;
  } else if (SchemaAST.isTupleType(ast)) {
    return new SchemaAST.TupleType(
      ast.elements.map((t) => new SchemaAST.OptionalType(mapSchemaTypeForLLM(t.type), t.isOptional, t.annotations)),
      ast.rest.map((t) => new SchemaAST.Type(mapSchemaTypeForLLM(t.type), t.annotations)),
      ast.isReadonly,
      ast.annotations,
    );
  } else if (SchemaAST.isTypeLiteral(ast)) {
    return new SchemaAST.TypeLiteral(
      ast.propertySignatures.map(
        (p) =>
          new SchemaAST.PropertySignature(
            p.name,
            mapSchemaTypeForLLM(p.type),
            p.isOptional,
            p.isReadonly,
            p.annotations,
          ),
      ),
      ast.indexSignatures,
      ast.annotations,
    );
  }

  return ast;
};

const isHandlerLike = (value: unknown): value is Toolkit.WithHandler<Record<string, Tool.Any>> => {
  return typeof (value as any).tools === 'object' && typeof (value as any).handle === 'function';
};
