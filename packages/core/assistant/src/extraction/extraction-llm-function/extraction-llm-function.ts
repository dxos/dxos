//
// Copyright 2025 DXOS.org
//

import { Message } from '@dxos/ai';
import { create } from '@dxos/echo-schema';
import { AiService, defineFunction, type FunctionDefinition } from '@dxos/functions';
import { DataType } from '@dxos/schema';

import { ExtractionInput, ExtractionOutput } from './extraction';
import PROMPT from './instructions.tpl?raw';
import { insertReferences, ReferencedQuotes } from './quotes';
import { AISession } from '../session';

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
