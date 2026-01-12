//
// Copyright 2025 DXOS.org
//

import type { OperationDefinition } from '@dxos/operation';

import type { Label } from '../../common/translations';

/**
 * Extract the input type from an OperationDefinition.
 */
export type InputOf<T> = T extends OperationDefinition<infer I, any> ? I : never;

/**
 * Extract the output type from an OperationDefinition.
 */
export type OutputOf<T> = T extends OperationDefinition<any, infer O> ? O : never;

/**
 * Message provider for undo toast.
 * Can be a static Label or a function that derives the message from input/output.
 */
export type MessageProvider<Op extends OperationDefinition<any, any>> =
  | Label
  | ((input: InputOf<Op>, output: OutputOf<Op>) => Label);

/**
 * Undo mapping that links a forward operation to its inverse.
 * Type parameters ensure deriveContext has correctly typed arguments.
 *
 * @template Op - The forward operation definition type.
 * @template Inv - The inverse operation definition type.
 */
export interface UndoMapping<
  Op extends OperationDefinition<any, any> = OperationDefinition<any, any>,
  Inv extends OperationDefinition<any, any> = OperationDefinition<any, any>,
> {
  /** The forward operation. */
  readonly operation: Op;

  /** The inverse operation to invoke for undo. */
  readonly inverse: Inv;

  /**
   * Derives the input for the inverse operation from the forward operation's input and output.
   * @param input - The input that was passed to the forward operation.
   * @param output - The output that was returned by the forward operation.
   * @returns The input to pass to the inverse operation, or undefined to indicate the operation is not undoable.
   */
  readonly deriveContext: (input: InputOf<Op>, output: OutputOf<Op>) => InputOf<Inv> | undefined;

  /**
   * Optional message to show in the undo toast.
   * Can be a static Label or a function that derives the message from input/output.
   */
  readonly message?: MessageProvider<Op>;
}

/**
 * Props for creating an UndoMapping.
 */
export interface UndoMappingProps<Op extends OperationDefinition<any, any>, Inv extends OperationDefinition<any, any>> {
  /** The forward operation. */
  operation: Op;

  /** The inverse operation to invoke for undo. */
  inverse: Inv;

  /**
   * Derives the input for the inverse operation from the forward operation's input and output.
   * Return undefined to indicate the operation is not undoable.
   */
  deriveContext: (input: InputOf<Op>, output: OutputOf<Op>) => InputOf<Inv> | undefined;

  /**
   * Optional message to show in the undo toast.
   * Can be a static Label or a function that derives the message from input/output.
   */
  message?: MessageProvider<Op>;
}

/**
 * Creates a type-safe undo mapping.
 *
 * @example
 * ```ts
 * // Static message
 * const mapping = UndoMapping.make({
 *   operation: DeleteThread,
 *   inverse: RestoreThread,
 *   deriveContext: (input, output) => ({
 *     thread: output.thread,
 *     anchor: output.anchor,
 *   }),
 *   message: ['thread deleted label', { ns: 'plugin-thread' }],
 * });
 *
 * // Dynamic message based on input/output
 * const mapping = UndoMapping.make({
 *   operation: RemoveObjects,
 *   inverse: RestoreObjects,
 *   deriveContext: (_input, output) => output,
 *   message: (input, _output) =>
 *     input.objects.length === 1
 *       ? ['object deleted label', { ns: getTypename(input.objects[0]) }]
 *       : ['objects deleted label', { ns: 'plugin-space' }],
 * });
 * ```
 */
export const make = <Op extends OperationDefinition<any, any>, Inv extends OperationDefinition<any, any>>(
  props: UndoMappingProps<Op, Inv>,
): UndoMapping<Op, Inv> => props;

/**
 * Resolves a message provider to a Label.
 */
export const resolveMessage = <Op extends OperationDefinition<any, any>>(
  message: MessageProvider<Op> | undefined,
  input: InputOf<Op>,
  output: OutputOf<Op>,
): Label | undefined => {
  if (message === undefined) {
    return undefined;
  }
  if (typeof message === 'function') {
    return message(input, output);
  }
  return message;
};
