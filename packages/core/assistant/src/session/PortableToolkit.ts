import type { DatabaseService, QueueService } from '@dxos/functions';
import * as Tool from '@effect/ai/Tool';
import * as Toolkit from '@effect/ai/Toolkit';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Pipeable from 'effect/Pipeable';
import * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';

/**
 * Unique identifier for generic toolkit instances.
 */
export const TypeId = '~@dxos/assistant/PortableToolkit';

/**
 * Type-level representation of the generic toolkit identifier.
 */
export type TypeId = typeof TypeId;

/**
 * Type-safe way to define toolkits where we don't know specific types of tools,
 * and we want to bundle definition and handlers together.
 *
 * Usefull for plugin-based systems, where tools are dynamically added.
 */

/**
 * Toolkit definition with handlers bundled.
 */
export interface PortableToolkit<in out Tools extends Record<string, Tool.Any>, E = never, R = never>
  extends Pipeable.Pipeable {
  readonly [TypeId]: TypeId;

  /**
   * Toolkit definition.
   */
  readonly toolkit: Toolkit.Toolkit<Tools>;

  /**
   * Handlers layer.
   */
  readonly layer: Layer.Layer<Tool.HandlersFor<Tools>, E, R>;

  /**
   * Handlers effect.
   */
  readonly handlers: Effect.Effect<Toolkit.WithHandler<Tools>, E, R>;
}

/**
 * Generic constraint.
 *
 * NOTE: Only use in place of `T extends PortableToolkit.Any`. Not suitable for standalone use.
 */
export interface Any {
  readonly [TypeId]: TypeId;
  readonly toolkit: Toolkit.Any;
  readonly layer: Layer.Layer<any, any, any>;
}

/**
 * Creates a portable toolkit from toolkit definition and handlers layer.
 */
export const make = <Tools extends Record<string, Tool.Any>, E, R>(
  toolkit: Toolkit.Toolkit<Tools>,
  layer: Layer.Layer<Tool.HandlersFor<Tools>, E, R>,
): PortableToolkit<Tools, E, R> => {
  return {
    [TypeId]: TypeId,
    toolkit,
    layer,
    handlers: toolkit.pipe(Effect.provide(layer)),
    pipe() {
      return Pipeable.pipeArguments(this, arguments);
    },
  };
};

/**
 * Merges multiple portable toolkits into a single portable toolkit.
 */
export const merge = <const Toolkits extends ReadonlyArray<Any>>(
  /**
   * The toolkits to merge together.
   */
  ...toolkits: Toolkits
): PortableToolkit<Toolkit.MergedTools<{ [Index in keyof Toolkits]: Toolkits[Index]['toolkit'] }>> => {
  return make(
    Toolkit.merge(...toolkits.map((t) => t.toolkit)),
    Layer.mergeAll(...(toolkits.map((t) => t.layer) as any)),
  ) as any;
};

/**
 * Generic tools type where we cannot statically enumerate individual tools.
 */
export type GenericTools<R = never> = Record<
  string,
  Tool.Tool<
    string,
    {
      readonly parameters: AnyStructSchemaNoContext;
      readonly success: Schema.Schema.AnyNoContext;
      readonly failure: typeof Schema.Never;
    },
    R
  >
>;

/**
 * Converts a portable toolkit with specific tools to a toolkit with generic tools.
 */
export const generalize = <Tools extends Record<string, Tool.Any>, E, R>(
  toolkit: PortableToolkit<Tools, E, R>,
): PortableToolkit<GenericTools<Tool.Requirements<Tools[keyof Tools]>>, E, R> => {
  return toolkit as any;
};

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

///
///
//

declare const tk1: PortableToolkit<GenericTools<DatabaseService>>;
declare const tk2: PortableToolkit<GenericTools<QueueService>>;

const tk: PortableToolkit<GenericTools<DatabaseService | QueueService>> = merge(tk1, tk2);
