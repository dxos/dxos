//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';

import { type AiParser, type ConsolePrinter } from '@dxos/ai';
import { type DataType } from '@dxos/schema';

/**
 * Live observer of the generation process.
 */
export interface GenerationObserver extends AiParser.ParseResponseCallbacks {
  /**
   * Complete messages fired during the session, both from the model and from the user.
   * This message will contain all message blocks emitted through the `onBlock` callback.
   */
  onMessage: (message: DataType.Message) => Effect.Effect<void>;
}

export const GenerationObserver = Object.freeze({
  make: ({
    onBegin = Function.constant(Effect.void),
    onPart = Function.constant(Effect.void),
    onBlock = Function.constant(Effect.void),
    onEnd = Function.constant(Effect.void),
    onMessage = Function.constant(Effect.void),
  }: Partial<GenerationObserver> = {}): GenerationObserver => ({
    onBegin,
    onPart,
    onBlock,
    onEnd,
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
