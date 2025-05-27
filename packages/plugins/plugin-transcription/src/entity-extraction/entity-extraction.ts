//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';

import { createTemplate, Message, structuredOutputParser } from '@dxos/artifact';
import type { AIServiceClient } from '@dxos/assistant';
import { MixedStreamParser } from '@dxos/assistant';
import { asyncTimeout } from '@dxos/async';
import { type BaseEchoObject, create, ObjectId } from '@dxos/echo-schema';
import { DXN } from '@dxos/keys';
import { log } from '@dxos/log';
import { DataType } from '@dxos/schema';

import SYSTEM_PROMPT from './system-prompt.tpl?raw';

type ProcessTranscriptMessageResult = {
  message: DataType.Message;
  timeElapsed: number;
};

/**
 * Process Handlebars template.
 */
const createSystemPrompt = (): string => {
  const template = createTemplate(SYSTEM_PROMPT);
  return template({});
};

const ReferencedQuotes = Schema.Struct({
  references: Schema.Array(
    Schema.Struct({
      quote: Schema.String,
      id: Schema.String,
    }),
  ).annotations({
    description:
      'The references to the context objects that are mentioned in the transcript. quote should match the original transcript text exactly, while id is the id of the context object.',
  }),
});
interface ReferencedQuotes extends Schema.Schema.Type<typeof ReferencedQuotes> {}

type ProcessTranscriptMessageParams = {
  message: DataType.Message;
  aiService: AIServiceClient;
  context: {
    objects?: BaseEchoObject[];
  };

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

// TODO(dmaretskyi): Move context to a vector search index.
export const processTranscriptMessage = async (
  params: ProcessTranscriptMessageParams,
): Promise<ProcessTranscriptMessageResult> => {
  try {
    const outputParser = structuredOutputParser(ReferencedQuotes);

    const runParser = async (): Promise<ProcessTranscriptMessageResult> => {
      const startTime = performance.now();
      const result = outputParser.getResult(
        await new MixedStreamParser().parse(
          await params.aiService.execStream({
            model: '@anthropic/claude-3-5-haiku-20241022', // TODO(burdon): Const.
            systemPrompt: createSystemPrompt(),
            history: [
              create(Message, {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: `<context>${JSON.stringify(params.context.objects)}</context>`,
                  },
                  {
                    type: 'text',
                    text: `<transcript>${JSON.stringify(params.message.blocks)}</transcript>`,
                  },
                ],
              }),
            ],
            tools: [outputParser.tool],
          }),
        ),
      );
      log.info('entity extraction result', { refs: result.references });

      return {
        message: create(DataType.Message, {
          ...params.message,
          blocks: params.message.blocks.map((block, i) =>
            block.type !== 'transcription'
              ? block
              : {
                  ...block,
                  text: postprocessText(block.text, result),
                },
          ),
        }),
        timeElapsed: performance.now() - startTime,
      };
    };

    if (params.options?.timeout && params.options.timeout > 0) {
      return await asyncTimeout(runParser(), params.options.timeout);
    } else {
      return await runParser();
    }
  } catch (error) {
    if (params.options?.fallbackToRaw) {
      log.warn('failed to process transcript message, falling back to raw text', { error });
      return {
        message: params.message,
        timeElapsed: 0,
      };
    } else {
      throw error;
    }
  }
};

/**
 * Finds and replaces all quotes with DXNs references.
 */
// TODO(dmaretskyi): Lookup and verifiy ids from provided context.
export const postprocessText = (text: string, quotes: ReferencedQuotes) => {
  for (const quote of quotes.references) {
    if (!ObjectId.isValid(quote.id)) {
      continue;
    }

    // Use a case-insensitive regular expression to replace the quote
    const regex = new RegExp(quote.quote.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    text = text.replace(regex, `[${quote.quote}][${DXN.fromLocalObjectId(quote.id).toString()}]`);
  }
  return text;
};
