//
// Copyright 2025 DXOS.org
//

import type * as Tool from '@effect/ai/Tool';
import * as Toolkit from '@effect/ai/Toolkit';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Pipeable from 'effect/Pipeable';
import type * as Schema from 'effect/Schema';
import type * as SchemaAST from 'effect/SchemaAST';

/**
 * Unique identifier for opaque toolkit instances.
 */
export const TypeId = '~@dxos/ai/OpaqueToolkit';

/**
 * Type-level representation of the opaque toolkit identifier.
 */
export type TypeId = typeof TypeId;

/**
 * Type-safe way to define toolkits where we don't know specific types of tools,
 * and we want to bundle definition and handlers together.
 *
 * Useful for plugin-based systems, where tools are dynamically added.
 *
 * @param TR requirements type to the tool invocation.
 * @param E failure type to the handlers layer.
 * @param R requirements type to the handlers layer.
 */
export interface OpaqueToolkit<TR = never, E = never, R = never> extends Pipeable.Pipeable {
  readonly [TypeId]: TypeId;

  /**
   * Toolkit definition.
   */
  readonly toolkit: Toolkit.Toolkit<OpaqueTools<TR>>;

  /**
   * Handlers layer.
   */
  readonly layer: Layer.Layer<unknown, E, R>;

  /**
   * Handlers effect.
   */
  readonly handlers: Effect.Effect<Toolkit.WithHandler<OpaqueTools<TR>>, E, R>;
}

/**
 * Generic constraint.
 *
 * NOTE: Only use in place of `T extends OpaqueToolkit.Any`. Not suitable for standalone use.
 */
export interface Any {
  readonly [TypeId]: TypeId;
  readonly toolkit: Toolkit.Toolkit<any>;
  readonly layer: Layer.Layer<unknown, any, any>;
  readonly handlers: Effect.Effect<Toolkit.WithHandler<any>, any, any>;
}

export type InvocationRequirements<T extends Any> = T extends OpaqueToolkit<infer TR, infer _E, infer _R> ? TR : never;
export type Failure<T extends Any> = T extends OpaqueToolkit<infer _TR, infer E, infer _R> ? E : never;
export type Requirements<T extends Any> = T extends OpaqueToolkit<infer _TR, infer _E, infer R> ? R : never;

/**
 * Creates a portable toolkit from toolkit definition and handlers layer.
 */
export const make = <Tools extends Record<string, Tool.Any>, E, R>(
  toolkit: Toolkit.Toolkit<Tools>,
  layer: Layer.Layer<Tool.HandlersFor<Tools>, E, R>,
): OpaqueToolkit<Tool.Requirements<Tools>, E, R> =>
  ({
    [TypeId]: TypeId,
    toolkit,
    layer,
    handlers: toolkit.pipe(Effect.provide(layer)),
    pipe() {
      // eslint-disable-next-line prefer-rest-params
      return Pipeable.pipeArguments(this, arguments);
    },
  }) as any;

/**
 * Creates an opaque toolkit from a typed toolkit by capturing handlers from the Effect context.
 */
export const fromContext = <Tools extends Record<string, Tool.Any>>(
  toolkit: Toolkit.Toolkit<Tools>,
): Effect.Effect<OpaqueToolkit<Tool.Requirements<Tools>>, never, Tool.HandlersFor<Tools>> =>
  Effect.map(
    Effect.context<Tool.HandlersFor<Tools>>(),
    (context): OpaqueToolkit<Tool.Requirements<Tools>> => make(toolkit, Layer.succeedContext(context)),
  );

/**
 * Satisfies dependencies of an opaque toolkit by providing a layer.
 * Similar to `Layer.provide`, removes satisfied requirements from `R`.
 *
 * @example
 * ```ts
 * // As a function
 * const narrowed = OpaqueToolkit.provide(toolkit, dbLayer);
 * // As a pipeable
 * const narrowed = toolkit.pipe(OpaqueToolkit.provide(dbLayer));
 * ```
 */
export const provide: {
  <R0, E2, R2>(
    layer: Layer.Layer<R0, E2, R2>,
  ): <TR, E, R>(self: OpaqueToolkit<TR, E, R>) => OpaqueToolkit<TR, E | E2, Exclude<R, R0> | R2>;
  <TR, E, R, R0, E2, R2>(
    self: OpaqueToolkit<TR, E, R>,
    layer: Layer.Layer<R0, E2, R2>,
  ): OpaqueToolkit<TR, E | E2, Exclude<R, R0> | R2>;
} = function (...args: any[]) {
  if (args.length === 1) {
    const [layer] = args;
    return (self: OpaqueToolkit<any, any, any>) => provideImpl(self, layer);
  }
  return provideImpl(args[0], args[1]);
} as any;

const provideImpl = <TR, E, R, R0, E2, R2>(
  self: OpaqueToolkit<TR, E, R>,
  layer: Layer.Layer<R0, E2, R2>,
): OpaqueToolkit<TR, E | E2, Exclude<R, R0> | R2> => {
  const provided = Layer.provide(self.layer, layer as any);
  return make(self.toolkit as any, provided as any) as any;
};

/**
 * Empty opaque toolkit.
 */
export const empty: OpaqueToolkit = make(Toolkit.empty, Layer.empty);

/**
 * Merges multiple portable toolkits into a single portable toolkit.
 */
export const merge = <const Toolkits extends ReadonlyArray<Any>>(
  /**
   * The toolkits to merge together.
   */
  ...toolkits: Toolkits
): OpaqueToolkit<
  InvocationRequirements<Toolkits[number]>,
  Failure<Toolkits[number]>,
  Requirements<Toolkits[number]>
> => {
  return make(
    Toolkit.merge(...toolkits.map((t) => t.toolkit)),
    Layer.mergeAll(...(toolkits.map((t) => t.layer) as [any, ...any[]])),
  ) as unknown as OpaqueToolkit<
    InvocationRequirements<Toolkits[number]>,
    Failure<Toolkits[number]>,
    Requirements<Toolkits[number]>
  >;
};

/**
 * Opaque tools type where we cannot statically enumerate individual tools.
 */
export type OpaqueTools<R = never> = Record<
  string,
  Tool.Tool<
    string,
    {
      readonly parameters: AnyStructSchemaNoContext;
      readonly success: Schema.Schema.AnyNoContext;
      readonly failure: typeof Schema.Never;
      readonly failureMode: Tool.FailureMode;
    },
    R
  >
>;

export interface AnyStructSchemaNoContext extends Pipeable.Pipeable {
  readonly [Schema.TypeId]: any;
  readonly make: any;
  readonly Type: any;
  readonly Encoded: any;
  readonly Context: never;
  readonly ast: SchemaAST.AST;
  readonly fields: Schema.Struct.Fields;
  readonly annotations: any;
}

/**
 * Provides an opaque toolkit to the agent.
 */
export class OpaqueToolkitProvider extends Context.Tag('@dxos/ai/OpaqueToolkit.OpaqueToolkitProvider')<
  OpaqueToolkitProvider,
  {
    readonly getToolkit: () => OpaqueToolkit;
  }
>() {}

/**
 * Layer for providing an opaque toolkit to the agent.
 */
export const providerLayer = (toolkit: OpaqueToolkit) =>
  Layer.succeed(OpaqueToolkitProvider, {
    getToolkit: () => toolkit,
  });

/**
 * Layer for providing an empty opaque toolkit to the agent.
 */
export const providerEmpty = providerLayer(empty);
