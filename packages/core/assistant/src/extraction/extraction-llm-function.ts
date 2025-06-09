//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';

import { create } from '@dxos/echo-schema';
import { DataType } from '@dxos/schema';

import PROMPT from './instructions.tpl?raw';
import { AiService, defineFunction, FunctionDefinition } from '@dxos/functions';
import { AISession } from '../session';
import { ExtractionInput, ExtractionOutput } from './extraction';
import { insertReferences } from './insert-references';
import { Message } from '@dxos/ai';

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
  inputSchema: ExtractionInput,
  outputSchema: ExtractionOutput,
  handler: async ({ data: { message, objects }, context }) => {
    const startTime = performance.now();
    const ai = context.getService(AiService);
    const session = new AISession({ operationModel: 'configured' });
    const result = await session.runStructured(ReferencedQuotes, {
      generationOptions: {
        model: '@anthropic/claude-3-5-haiku-20241022',
      },
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
                text: insertReferences(block.text, result),
              },
        ),
      }),
      timeElapsed: performance.now() - startTime,
    };
  },
});
