//
// Copyright 2025 DXOS.org
//

import type * as Effect from 'effect/Effect';
import type * as Schema from 'effect/Schema';

import type * as Operation from './Operation';
import type { Service as OperationService } from './service';

// @import-as-namespace

/**
 * Base requirements provided to all operation handlers.
 * Handlers can optionally use these services.
 */
export type HandlerContext = OperationService;

/**
 * Allowed services for a handler: services declared on the operation plus Operation.Service.
 */
type AllowedServices<Def extends Operation.Definition<any, any>> =
  | Operation.Definition.Services<Def>
  | OperationService;

/**
 * Operation resolver - maps an operation definition to a handler.
 * Handlers are provided with HandlerContext (Operation.Service) by the invoker.
 */
export interface OperationResolver<I = any, O = any, E extends Error = Error, R = HandlerContext> {
  operation: Operation.Definition<I, O>;
  handler: Operation.Handler<I, O, E, R>;
}

/**
 * Props for creating an operation resolver.
 * Handler can only use services declared on the operation, plus Operation.Service.
 */
export type OperationResolverProps<Def extends Operation.Definition<any, any>, E extends Error = never> = {
  operation: Def;
  handler: (
    input: Schema.Schema.Type<Def['input']>,
  ) => Effect.Effect<Schema.Schema.Type<Def['output']>, E, AllowedServices<Def>>;
};

/**
 * Creates an operation resolver with full type inference from the operation definition.
 * The handler can only use services declared in the operation's `services` field,
 * plus Operation.Service which is always available.
 *
 * @example
 * ```ts
 * // Operation with Database.Service requirement
 * const MyOp = Operation.make({
 *   input: Schema.Struct({}),
 *   output: Schema.Struct({ result: Schema.String }),
 *   meta: { key: 'my-op' },
 *   services: [Database.Service],
 * });
 *
 * // Handler type is inferred to require Database.Service
 * OperationResolver.make({
 *   operation: MyOp,
 *   handler: (input) => Effect.gen(function* () {
 *     const { db } = yield* Database.Service;
 *     return { result: 'success' };
 *   }),
 * })
 * ```
 */
export const make = <Def extends Operation.Definition<any, any>, E extends Error = never>(
  props: OperationResolverProps<Def, E>,
): OperationResolver<Schema.Schema.Type<Def['input']>, Schema.Schema.Type<Def['output']>, E, AllowedServices<Def>> => {
  return props as OperationResolver<
    Schema.Schema.Type<Def['input']>,
    Schema.Schema.Type<Def['output']>,
    E,
    AllowedServices<Def>
  >;
};
