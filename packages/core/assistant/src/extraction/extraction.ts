//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { asyncTimeout } from '@dxos/async';
import { Expando } from '@dxos/echo/internal';
import { type FunctionDefinition } from '@dxos/functions';
import { type FunctionExecutor } from '@dxos/functions-runtime';
import { log } from '@dxos/log';
import { Message } from '@dxos/types';

export const ExtractionInput = Schema.Struct({
  message: Message.Message,
  objects: Schema.optional(Schema.Array(Expando)),
  options: Schema.optional(
    Schema.Struct({
      timeout: Schema.optional(Schema.Number),
      fallbackToRaw: Schema.optional(Schema.Boolean),
    }),
  ),
});
export interface ExtractionInput extends Schema.Schema.Type<typeof ExtractionInput> {}

export const ExtractionOutput = Schema.Struct({
  message: Message.Message,
  timeElapsed: Schema.Number,
});
export interface ExtractionOutput extends Schema.Schema.Type<typeof ExtractionOutput> {}

export type ProcessTranscriptMessageParams = {
  input: ExtractionInput;
  function: FunctionDefinition<ExtractionInput, ExtractionOutput>;
  executor: FunctionExecutor;

  options?: {
    /**
     * Timeout for the entity extraction.
     */
    timeout?: number;

    /**
     * Fallback to raw text if the entity extraction fails.
     * Otherwise the function will throw an error.
     * @default false
     */
    fallbackToRaw?: boolean;
  };
};

export type ExtractionFunction = FunctionDefinition<ExtractionInput, ExtractionOutput>;

/**
 * Extract entities from the transcript message and add them to the message.
 */
// TODO(dmaretskyi): Move context to a vector search index.
export const processTranscriptMessage = async (params: ProcessTranscriptMessageParams): Promise<ExtractionOutput> => {
  try {
    if (params.options?.timeout && params.options.timeout > 0) {
      return await asyncTimeout(params.executor.invoke(params.function, params.input), params.options.timeout);
    } else {
      return await params.executor.invoke(params.function, params.input);
    }
  } catch (error) {
    if (params.options?.fallbackToRaw) {
      log.warn('failed to process message, falling back to raw text', { error });
      return {
        message: params.input.message,
        timeElapsed: 0,
      };
    } else {
      throw error;
    }
  }
};
