//
// Copyright 2025 DXOS.org
//

import * as Context from 'effect/Context';
import type * as Effect from 'effect/Effect';
import * as Pipeable from 'effect/Pipeable';
import * as Schema$ from 'effect/Schema';

import { Annotation, JsonSchema, Obj, Ref, Type } from '@dxos/echo';
import type * as Types from 'effect/Types';

// @import-as-namespace

/**
 * Schema type that accepts any Encoded form but requires no Context.
 * This allows ECHO object schemas where Type !== Encoded due to [KindId] symbol.
 */
type Schema<T> = Schema$.Schema<T, any, never>;

export const DefinitionTypeId = '~@dxos/operation/OperationDefinition' as const;
export type DefinitionTypeId = typeof DefinitionTypeId;

/**
 * Serializable definition of an Operation.
 * Contains schema and metadata, but no runtime logic.
 */
export interface Definition<I, O, S = any> extends Pipeable.Pipeable, Definition.Variance<I, O, S> {
  /**
   * Input schema for the operation.
   */
  readonly input: Schema<I>;
  /**
   * Output schema for the operation.
   */
  readonly output: Schema<O>;

  readonly meta: {
    readonly key: string;
    readonly name?: string;
    readonly version?: string;
    readonly description?: string;
    /**
     * Deployment ID for remote invocation.
     * Assigned by the EDGE function service when deployed.
     */
    readonly deployedId?: string;
  };

  /**
   * Execution mode for the operation.
   * - 'sync': Operation completes synchronously (fast, UI-blocking acceptable).
   * - 'async': Operation may take time (should not block UI).
   */
  readonly executionMode: 'sync' | 'async';

  /**
   * ECHO types the operation uses.
   * Ensures types are available when the operation is executed remotely.
   */
  readonly types: readonly Type.AnyEntity[];

  /**
   * Effect services required by this operation.
   * These services will be automatically provided to the handler at invocation time.
   */
  readonly services: readonly Context.Tag<any, any>[];
}

/**
 * Namespace for OperationDefinition helper types.
 */
export declare namespace Definition {
  export interface Variance<I, O, S> {
    [DefinitionTypeId]: {
      readonly _Input: Types.Contravariant<I>;
      readonly _Output: Types.Covariant<O>;
      readonly _Services: Types.Covariant<S>;
    };
  }

  /**
   * Any operation definition, regardless of input/output types.
   */
  export type Any = Definition<any, any, any>;

  /**
   * Extract the input type from an operation definition.
   */
  export type Input<T extends Any> = T extends Variance<infer I, infer _O, infer _S> ? I : never;

  /**
   * Extract the output type from an operation definition.
   */
  export type Output<T extends Any> = T extends Variance<infer _I, infer O, infer _S> ? O : never;

  /**
   * Extract the service identifier types from an operation's services array.
   * Returns `never` if the operation has no services declared.
   */
  export type Services<T extends Any> = T extends Variance<infer _I, infer _O, infer S> ? S : never;

  export type HandlerType<T extends Any> =
    T extends Variance<infer I, infer O, infer S> ? Handler<I, O, any, S> : never;
}

/**
 * Runtime handler for an Operation.
 */
export type Handler<I, O, E = Error, R = never> = (input: I) => Effect.Effect<O, E, R>;

export type WithHandler<T extends Definition.Any> = T & {
  handler: Definition.HandlerType<T>;
};

/**
 * Checks if a value is an operation definition.
 */
export const isOperationDefinition = (value: unknown): value is Definition.Any => {
  return typeof value === 'object' && value !== null && DefinitionTypeId in value;
};

/**
 * Checks if a value is an operation with a handler.
 */
export const isOperationWithHandler = (value: unknown): value is WithHandler<Definition.Any> => {
  return isOperationDefinition(value) && 'handler' in value;
};

/**a
 * Props for creating an Operation definition.
 * Derived from OperationDefinition with executionMode made optional (defaults to 'async').
 */
export type Props<I, O> = Omit<Definition<I, O>, DefinitionTypeId | 'pipe' | 'executionMode' | 'types' | 'services'> & {
  readonly executionMode?: 'sync' | 'async';
  readonly types?: Definition<I, O>['types'];
  readonly services?: Definition<I, O>['services'];
};

/**
 * Creates a new Operation definition.
 * Applies default executionMode of 'async' if not specified.
 * The returned type preserves the literal types of props (including services).
 */
export const make = <const P extends Types.NoExcessProperties<Props<any, any>, P>>(
  props: P,
): Definition<
  Schema$.Schema.Type<P['input']>,
  Schema$.Schema.Type<P['output']>,
  Context.Tag.Identifier<NonNullable<P['services']>[number]>
> => {
  return {
    [DefinitionTypeId]: { },
    ...props,
    executionMode: props.executionMode ?? 'async',
    types: props.types ?? [],
    services: props.services ?? [],
    pipe() {
      // eslint-disable-next-line prefer-rest-params
      return Pipeable.pipeArguments(this, arguments);
    },
  } as any;
};

/**
 * Attaches a handler to an Operation definition.
 * The handler's required services (R) must be a subset of the services declared in the operation.
 * Dual API: can be called directly or used in a pipe.
 *
 * @example
 * ```ts
 * const MyOp = Operation.make({
 *   input: Schema.Void,
 *   output: Schema.Void,
 *   meta: { key: 'my-op' },
 *   services: [DatabaseService],
 * });
 *
 * // Direct call - handler can use DatabaseService
 * const op = Operation.withHandler(MyOp, (input) =>
 *   Effect.gen(function* () {
 *     const db = yield* DatabaseService;
 *     return {};
 *   }),
 * );
 *
 * // Piped call
 * const op = MyOp.pipe(Operation.withHandler((input) => Effect.succeed({})));
 * ```
 */
export const withHandler: {
  <Def extends Definition<any, any>, E = never>(
    handler: Handler<Definition.Input<Def>, Definition.Output<Def>, E, Definition.Services<Def>>,
  ): (op: Def) => WithHandler<Def>;
  <Def extends Definition<any, any>, E = never>(
    op: Def,
    handler: Handler<Definition.Input<Def>, Definition.Output<Def>, E, Definition.Services<Def>>,
  ): WithHandler<Def>;
} = <Def extends Definition<any, any>, E = never>(
  opOrHandler: Def | Handler<Definition.Input<Def>, Definition.Output<Def>, E, Definition.Services<Def>>,
  handler?: Handler<Definition.Input<Def>, Definition.Output<Def>, E, Definition.Services<Def>>,
): WithHandler<Def> => {
  // If called with just handler (piped usage).
  if (handler === undefined) {
    const handlerFn = opOrHandler as Handler<
      Definition.Input<Def>,
      Definition.Output<Def>,
      E,
      Definition.Services<Def>
    >;
    return ((op: Def) => ({
      ...op,
      handler: handlerFn,
    })) as any;
  }

  // If called with both op and handler (direct usage).
  const op = opOrHandler as Def;
  return {
    ...op,
    handler,
  } as any;
};

//
// Invocation Interfaces
//

/**
 * Local invocation of an operation.
 */
export type Invoke = <I, O, E>(op: Definition<I, O>, input: I) => Effect.Effect<O, E>;

/**
 * Remote invocation of an operation.
 */
export type InvokeRemote = <I, O, E>(
  op: Definition<I, O>,
  input: I,
  options?: { timeout?: number },
) => Effect.Effect<O, E>;

/**
 * Database record of an operation.
 */
export const PersistentOperation = Schema$.Struct({
  /**
   * Global registry ID.
   * NOTE: The `key` property refers to the original registry entry.
   */
  // TODO(burdon): Create Format type for DXN-like ids, such as this and schema type.
  // TODO(dmaretskyi): Consider making it part of ECHO meta.
  // TODO(dmaretskyi): Make required.
  key: Schema$.optional(Schema$.String).annotations({
    description: 'Unique registration key for the blueprint',
  }),

  name: Schema$.NonEmptyString,
  version: Schema$.String,

  description: Schema$.optional(Schema$.String),

  /**
   * ISO date string of the last deployment.
   */
  updated: Schema$.optional(Schema$.String),

  // Reference to a source script if it exists within ECHO.
  // TODO(burdon): Don't ref ScriptType directly (core).
  source: Schema$.optional(Ref.Ref(Obj.Unknown)),

  inputSchema: Schema$.optional(JsonSchema.JsonSchema),
  outputSchema: Schema$.optional(JsonSchema.JsonSchema),

  /**
   * List of required services.
   * Match the Context.Tag keys of the FunctionServices variants.
   */
  services: Schema$.optional(Schema$.Array(Schema$.String)),

  // Local binding to a function name.
  // TODO(dmaretskyi): Add this field to Operation.Definition.
  binding: Schema$.optional(Schema$.String),
}).pipe(
  Type.object({
    typename: 'org.dxos.type.function',
    version: '0.1.0',
  }),
  Annotation.LabelAnnotation.set(['name']),
  Annotation.IconAnnotation.set({ icon: 'ph--function--regular', hue: 'blue' }),
  Annotation.SystemTypeAnnotation.set(true),
);
export interface PersistentOperation extends Schema$.Schema.Type<typeof PersistentOperation> {}

/**
 * Serialize an operation definition to a persistent operation record.
 */
export const serialize = (operation: Definition.Any): PersistentOperation => {
  return Obj.make(PersistentOperation, {
    key: operation.meta.key,
    name: operation.meta.name ?? '',
    version: operation.meta.version ?? '0.0.0',
    description: operation.meta.description,
    updated: undefined,
    source: undefined,
    inputSchema: JsonSchema.toJsonSchema(operation.input),
    outputSchema: JsonSchema.toJsonSchema(operation.output),
    services: operation.services.map((service) => service.key),
  });
};

/**
 * Deserialize a persistent operation record to an operation definition.
 */
export const deserialize = (record: PersistentOperation): Definition.Any => {
  return make({
    input: record.inputSchema ? JsonSchema.toEffectSchema(record.inputSchema) : Schema$.Unknown,
    output: record.outputSchema ? JsonSchema.toEffectSchema(record.outputSchema) : Schema$.Unknown,
    services: record.services?.map((service) => Context.GenericTag(service)) ?? [],
    executionMode: 'async',
    types: [],
    meta: {
      key: record.key ?? record.name,
      name: record.name,
      version: record.version,
      description: record.description,
    },
  });
};

/**
 * Update properties on the target operation record from the source operation record.
 */
export const setFrom = (target: PersistentOperation, source: PersistentOperation) => {
  Obj.change(target, (target) => {
    target.key = source.key ?? target.key;
    target.name = source.name ?? target.name;
    target.version = source.version;
    target.description = source.description;
    target.updated = source.updated;
    // TODO(dmaretskyi): A workaround for an ECHO bug.
    target.inputSchema = source.inputSchema ? JSON.parse(JSON.stringify(source.inputSchema)) : undefined;
    target.outputSchema = source.outputSchema ? JSON.parse(JSON.stringify(source.outputSchema)) : undefined;
    Obj.getMeta(target).keys = JSON.parse(JSON.stringify(Obj.getMeta(source).keys));
  });
};

//
// Re-export service types and functions for Operation namespace.
//

export { type InvokeOptions, type OperationService, Service, invoke, schedule } from './service';
