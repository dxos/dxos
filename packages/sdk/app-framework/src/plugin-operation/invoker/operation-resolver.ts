//
// Copyright 2025 DXOS.org
//

import type * as Effect from 'effect/Effect';
import type * as Schema from 'effect/Schema';

import type { OperationDefinition, OperationHandler } from '@dxos/operation';
import type { Position } from '@dxos/util';

/**
 * Operation resolver - maps an operation definition to a handler with optional filter.
 */
export interface OperationResolver<I = any, O = any, E extends Error = Error, R = never> {
  operation: OperationDefinition<I, O>;
  handler: OperationHandler<I, O, E, R>;
  position?: Position;
  filter?: (input: I) => boolean;
}

/**
 * Props for creating an operation resolver.
 */
export type OperationResolverProps<Def extends OperationDefinition<any, any>, E extends Error = Error, R = never> = {
  operation: Def;
  handler: (
    input: Schema.Schema.Type<Def['schema']['input']>,
  ) => Effect.Effect<Schema.Schema.Type<Def['schema']['output']>, E, R>;
  position?: Position;
  filter?: (input: Schema.Schema.Type<Def['schema']['input']>) => boolean;
};

/**
 * Creates an operation resolver with full type inference from the operation definition.
 *
 * @example
 * ```ts
 * OperationResolver.make({
 *   operation: LayoutOperation.UpdateSidebar,
 *   handler: (input) => Effect.sync(() => {
 *     // input is fully typed from the operation's input schema
 *     console.log(input.state);
 *   }),
 * })
 * ```
 */
export const make = <Def extends OperationDefinition<any, any>, E extends Error = Error, R = never>(
  props: OperationResolverProps<Def, E, R>,
): OperationResolver<Schema.Schema.Type<Def['schema']['input']>, Schema.Schema.Type<Def['schema']['output']>, E, R> => {
  return props as OperationResolver<
    Schema.Schema.Type<Def['schema']['input']>,
    Schema.Schema.Type<Def['schema']['output']>,
    E,
    R
  >;
};
