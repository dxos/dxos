//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Obj } from '@dxos/echo';
import { type FunctionExecutor } from '@dxos/functions-runtime';
import { log } from '@dxos/log';
import { Operation } from '@dxos/operation';
import { Message } from '@dxos/types';

export const ExtractionInput = Schema.Struct({
  message: Message.Message,
  objects: Schema.optional(Schema.Array(Obj.Unknown)),
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

export type ProcessTranscriptMessageProps = {
  input: ExtractionInput;
  function: Operation.Definition<ExtractionInput, ExtractionOutput>;
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

export type ExtractionFunction = Operation.Definition<ExtractionInput, ExtractionOutput>;

/**
 * Placeholder for Anthropic-based entity extraction.
 * Implementation is currently disabled pending restoration of extraction logic.
 */
export const extractionAnthropicFunction = Operation.make({
  meta: {
    key: 'org.dxos.function.extraction.anthropic',
    name: 'Entity Extraction (Anthropic)',
    description: 'Extract entities from transcript using Anthropic LLM.',
  },
  input: ExtractionInput,
  output: ExtractionOutput,
});

/**
 * Placeholder for NER-based entity extraction.
 * Implementation is currently disabled pending restoration of extraction logic.
 */
export const extractionNerFunction = Operation.make({
  meta: {
    key: 'org.dxos.function.extraction.ner',
    name: 'Entity Extraction (NER)',
    description: 'Extract entities from transcript using Named Entity Recognition.',
  },
  input: ExtractionInput,
  output: ExtractionOutput,
});

/**
 * Extract entities from the transcript message and add them to the message.
 */
// TODO(dmaretskyi): Move context to a vector search index.
export const processTranscriptMessage = async (params: ProcessTranscriptMessageProps): Promise<ExtractionOutput> => {
  try {
    if (params.options?.timeout && params.options.timeout > 0) {
      // return await asyncTimeout(params.executor.invoke(params.function, params.input), params.options.timeout);
    } else {
      // return await params.executor.invoke(params.function, params.input);
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

  // TODO(dmaretskyi): Restore extraction logic.
  return { message: params.input.message, timeElapsed: 0 };
};
