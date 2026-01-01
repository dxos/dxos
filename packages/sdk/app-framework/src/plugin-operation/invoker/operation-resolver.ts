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
 * R defaults to HandlerContext, allowing handlers to use FollowupScheduler.Service.
 */
export type OperationResolverProps<
  Def extends OperationDefinition<any, any>,
  E extends Error = Error,
  R = HandlerContext,
> = {
  operation: Def;
  handler: (
    input: Schema.Schema.Type<Def['schema']['input']>,
  ) => Effect.Effect<Schema.Schema.Type<Def['schema']['output']>, E, R>;
  position?: Position;
  filter?: (input: Schema.Schema.Type<Def['schema']['input']>) => boolean;
};

/**
 * Creates an operation resolver with full type inference from the operation definition.
 * Handlers are automatically provided with FollowupScheduler.Service by the invoker.
 *
 * @example
 * ```ts
 * OperationResolver.make({
 *   operation: LayoutOperation.UpdateSidebar,
 *   handler: (input) => Effect.gen(function* () {
 *     // Access FollowupScheduler if needed
 *     const scheduler = yield* FollowupScheduler.Service;
 *     yield* scheduler.schedule(SomeOtherOp, { data: 'followup' });
 *     return { success: true };
 *   }),
 * })
 * ```
 */
export const make = <Def extends OperationDefinition<any, any>, E extends Error = Error, R = HandlerContext>(
  props: OperationResolverProps<Def, E, R>,
): OperationResolver<Schema.Schema.Type<Def['schema']['input']>, Schema.Schema.Type<Def['schema']['output']>, E, R> => {
  return props as OperationResolver<
    Schema.Schema.Type<Def['schema']['input']>,
    Schema.Schema.Type<Def['schema']['output']>,
    E,
    R
  >;
};
