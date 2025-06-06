//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';

import { type AIServiceClient, Message, MixedStreamParser, structuredOutputParser } from '@dxos/ai';
import { createTemplate } from '@dxos/artifact';
import { asyncTimeout } from '@dxos/async';
import { type BaseEchoObject, create, Expando, ObjectId } from '@dxos/echo-schema';
import { DXN } from '@dxos/keys';
import { log } from '@dxos/log';
import { DataType } from '@dxos/schema';

import PROMPT from './instructions.tpl?raw';
import { AiService, defineFunction, FunctionDefinition, FunctionExecutor } from '@dxos/functions';
import { AISession } from '../session';

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

export const extractionAnthropicFn: FunctionDefinition<ExtractionInput, ExtractionOutput> = defineFunction({
  description: 'Extract entities from the transcript message and add them to the message.',
  inputSchema: Schema.Struct({
    message: DataType.Message,
    objects: Schema.optional(Schema.Array(Expando)),
    options: Schema.optional(
      Schema.Struct({
        timeout: Schema.optional(Schema.Number),
        fallbackToRaw: Schema.optional(Schema.Boolean),
      }),
    ),
  }),
  outputSchema: Schema.Struct({
    message: DataType.Message,
    timeElapsed: Schema.Number,
  }),
  handler: async ({ data: { message, objects }, context }) => {
    const startTime = performance.now();
    const ai = context.getService(AiService);
    const session = new AISession({ operationModel: 'configured' });
    const result = await session.runStructured(ReferencedQuotes, {
      client: ai.client,
      systemPrompt: PROMPT,
      history: [
        create(Message, {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `<context>${JSON.stringify(objects)}</context>`,
            },
            {
              type: 'text',
              text: `<transcript>${JSON.stringify(message.blocks)}</transcript>`,
            },
          ],
        }),
      ],
      artifacts: [],
      prompt: '',
      tools: [],
    });

    return {
      message: create(DataType.Message, {
        ...message,
        blocks: message.blocks.map((block, i) =>
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
  },
});

/**
 * Finds and replaces all quotes with DXNs references.
 */
// TODO(dmaretskyi): Lookup and verifiy ids from provided context.
export const postprocessText = (text: string, quotes: ReferencedQuotes) => {
  for (const quote of quotes.references) {
    if (!ObjectId.isValid(quote.id)) {
      continue;
    }

    // Use a case-insensitive regular expression to replace the quote.
    const regex = new RegExp(quote.quote.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    text = text.replace(regex, `[${quote.quote}][${DXN.fromLocalObjectId(quote.id).toString()}]`);
  }

  return text;
};
