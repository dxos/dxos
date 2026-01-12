//
// Copyright 2025 DXOS.org
//

import type * as Effect from 'effect/Effect';
import type * as Schema from 'effect/Schema';

import type { OperationDefinition, OperationHandler } from '@dxos/operation';
import type { Position } from '@dxos/util';

import type * as FollowupScheduler from './followup-scheduler';

/**
 * Base requirements provided to all operation handlers.
 * Handlers can optionally use these services.
 */
export type HandlerContext = FollowupScheduler.Service;

/**
 * Allowed services for a handler: services declared on the operation plus FollowupScheduler.
 */
type AllowedServices<Def extends OperationDefinition<any, any>> =
  | OperationDefinition.Services<Def>
  | FollowupScheduler.Service;

/**
 * Operation resolver - maps an operation definition to a handler with optional filter.
 * Handlers are provided with HandlerContext (FollowupScheduler.Service) by the invoker.
 */
export interface OperationResolver<I = any, O = any, E extends Error = Error, R = HandlerContext> {
  operation: OperationDefinition<I, O>;
  handler: OperationHandler<I, O, E, R>;
  position?: Position;
  filter?: (input: I) => boolean;
}

/**
 * Props for creating an operation resolver.
 * Handler can only use services declared on the operation, plus FollowupScheduler.Service.
 */
export type OperationResolverProps<Def extends OperationDefinition<any, any>, E extends Error = never> = {
  operation: Def;
  handler: (
    input: Schema.Schema.Type<Def['schema']['input']>,
  ) => Effect.Effect<Schema.Schema.Type<Def['schema']['output']>, E, AllowedServices<Def>>;
  position?: Position;
  filter?: (input: Schema.Schema.Type<Def['schema']['input']>) => boolean;
};

/**
 * Creates an operation resolver with full type inference from the operation definition.
 * The handler can only use services declared in the operation's `services` field,
 * plus FollowupScheduler.Service which is always available.
 *
 * @example
 * ```ts
 * // Operation with Database.Service requirement
 * const MyOp = Operation.make({
 *   schema: { input: Schema.Struct({}), output: Schema.Struct({ result: Schema.String }) },
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
export const make = <Def extends OperationDefinition<any, any>, E extends Error = never>(
  props: OperationResolverProps<Def, E>,
): OperationResolver<
  Schema.Schema.Type<Def['schema']['input']>,
  Schema.Schema.Type<Def['schema']['output']>,
  E,
  AllowedServices<Def>
> => {
  return props as OperationResolver<
    Schema.Schema.Type<Def['schema']['input']>,
    Schema.Schema.Type<Def['schema']['output']>,
    E,
    AllowedServices<Def>
  >;
};
