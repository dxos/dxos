//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';

/**
 * Extract the input type from an OperationDefinition.
 */
export type InputOf<T> = T extends Operation.Definition<infer I, any> ? I : never;

/**
 * Extract the output type from an OperationDefinition.
 */
export type OutputOf<T> = T extends Operation.Definition<any, infer O> ? O : never;

/**
 * Registers the observability event a successful invocation of an operation stands for.
 *
 * A listener over the invocation stream emits the event, so a portable verb is never bound to
 * whichever plugin implements telemetry (mirrors `UndoMapping`).
 *
 * @template Op - The operation whose invocation the event stands for.
 */
export interface ObservabilityMapping<Op extends Operation.Definition<any, any> = Operation.Definition<any, any>> {
  /** The operation whose successful invocation emits the event. */
  readonly operation: Op;

  /** The event name. */
  readonly event: string;

  /**
   * Derives the event's properties from the invocation's input and output.
   * @returns The properties to send, or undefined to skip the event for this invocation.
   */
  readonly properties?: (input: InputOf<Op>, output: OutputOf<Op>) => Record<string, unknown> | undefined;
}

/**
 * Props for creating an ObservabilityMapping.
 */
export interface ObservabilityMappingProps<Op extends Operation.Definition<any, any>> {
  /** The operation whose successful invocation emits the event. */
  operation: Op;

  /** The event name. */
  event: string;

  /** Derives the event's properties; returns undefined to skip the event for this invocation. */
  properties?: (input: InputOf<Op>, output: OutputOf<Op>) => Record<string, unknown> | undefined;
}

/**
 * Creates a type-safe observability mapping.
 *
 * @example
 * ```ts
 * const mapping = ObservabilityMapping.make({
 *   operation: SpaceOperation.AddObject,
 *   event: 'space.object.add',
 *   properties: (_input, output) => ({ objectId: output.object.id }),
 * });
 * ```
 */
export const make = <Op extends Operation.Definition<any, any>>(
  props: ObservabilityMappingProps<Op>,
): ObservabilityMapping<Op> => props;

/** The mapping registered for an operation, or undefined when the operation emits no event. */
export const find = (
  mappings: readonly ObservabilityMapping[],
  operation: Operation.Definition<any, any>,
): ObservabilityMapping | undefined => mappings.find(({ operation: op }) => op.meta.key === operation.meta.key);
