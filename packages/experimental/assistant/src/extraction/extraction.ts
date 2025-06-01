//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';

import { type AIServiceClient, Message, MixedStreamParser, structuredOutputParser } from '@dxos/ai';
import { createTemplate } from '@dxos/artifact';
import { asyncTimeout } from '@dxos/async';
import { type BaseEchoObject, create, ObjectId } from '@dxos/echo-schema';
import { DXN } from '@dxos/keys';
import { log } from '@dxos/log';
import { DataType } from '@dxos/schema';

import PROMPT from './instructions.tpl?raw';

// TODO(burdon): Rename: is this transcript specific?

const ReferencedQuotes = Schema.Struct({
  references: Schema.Array(
    Schema.Struct({
      id: Schema.String,
      quote: Schema.String, // TODO(burdon): Quote?
    }),
  ).annotations({
    // TODO(burdon): Does this description make sense?
    description: `
      The references to the context objects that are mentioned in the transcript. 
      Quote should match the original transcript text exactly, while id is the id of the context object.
    `,
  }),
});
interface ReferencedQuotes extends Schema.Schema.Type<typeof ReferencedQuotes> {}

type ProcessTranscriptMessageResult = {
  message: DataType.Message;
  timeElapsed: number;
};

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

/**
 * Extract entities from the transcript message and add them to the message.
 */
// TODO(burdon): Convert to function like `researchFn`.
// TODO(dmaretskyi): Move context to a vector search index.
export const processTranscriptMessage = async (
  params: ProcessTranscriptMessageParams,
): Promise<ProcessTranscriptMessageResult> => {
  try {
    const template = createTemplate(PROMPT);
    const outputParser = structuredOutputParser(ReferencedQuotes);

    const runParser = async (): Promise<ProcessTranscriptMessageResult> => {
      const startTime = performance.now();
      const result = outputParser.getResult(
        await new MixedStreamParser().parse(
          await params.aiService.execStream({
            model: '@anthropic/claude-3-5-haiku-20241022', // TODO(burdon): Move to context.
            systemPrompt: template({}),
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
      log.warn('failed to process message, falling back to raw text', { error });
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
