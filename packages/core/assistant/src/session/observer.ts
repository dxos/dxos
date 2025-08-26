//
// Copyright 2025 DXOS.org
//

import { type AiResponse } from '@effect/ai';
import { Effect, Function } from 'effect';

import { type ConsolePrinter } from '@dxos/ai';
import { type ContentBlock, type DataType } from '@dxos/schema';

/**
 * Live observer of the generation process.
 */
export interface GenerationObserver {
  /**
   * Unparsed content block parts from the model.
   */
  onPart: (part: AiResponse.Part) => Effect.Effect<void>;

  /**
   * Parsed content blocks from the model.
   * NOTE: Use block.pending to determine if the block was completed.
   * For each block this will be called 0..n times with a pending block and then once with the final state of the block.
   *
   * Example:
   *  1. { pending: true, text: "Hello"}
   *  2. { pending: true, text: "Hello, I am a"}
   *  3. { pending: false, text: "Hello, I am a helpful assistant!"}
   */
  onBlock: (block: ContentBlock.Any) => Effect.Effect<void>;

  /**
   * Complete messages fired during the session, both from the model and from the user.
   * This message will contain all message blocks emitted through the `onBlock` callback.
   */
  onMessage: (message: DataType.Message) => Effect.Effect<void>;
}

export const GenerationObserver = Object.freeze({
  make: ({
    onPart = Function.constant(Effect.void),
    onBlock = Function.constant(Effect.void),
    onMessage = Function.constant(Effect.void),
  }: Partial<GenerationObserver> = {}): GenerationObserver => ({
    onPart,
    onBlock,
    onMessage,
  }),

  noop: () => GenerationObserver.make(),

  /**
   * Debug printer to be used in unit-tests and browser devtools.
   */
  fromPrinter: (printer: ConsolePrinter) =>
    GenerationObserver.make({
      onBlock: (block) =>
        Effect.sync(() => {
          if (block.pending) {
            return; // Only prints full blocks (better for unit-tests and browser devtools).
          }
          printer.printContentBlock(block);
        }),
      onMessage: (message) =>
        Effect.sync(() => {
          if (message.sender.role === 'assistant') {
            return; // Skip assistant messages since they are printed in the `onBlock` callback.
          }
          printer.printMessage(message);
        }),
    }),
});
