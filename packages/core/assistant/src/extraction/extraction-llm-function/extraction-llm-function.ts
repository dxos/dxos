//
// Copyright 2025 DXOS.org
//

import { ToolRegistry, AiService } from '@dxos/ai';
import { Obj } from '@dxos/echo';
import { create } from '@dxos/echo-schema';
import { defineFunction, type FunctionDefinition } from '@dxos/functions';
import { type ContentBlock, DataType } from '@dxos/schema';

import PROMPT from './instructions.tpl?raw';
import { AISession } from '../../session';
import { ExtractionInput, ExtractionOutput } from '../extraction';
import { insertReferences, ReferencedQuotes } from '../quotes';

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
        Obj.make(DataType.Message, {
          created: new Date().toISOString(),
          sender: {
            role: 'user',
          },
          blocks: [
            {
              _tag: 'text',
              text: `<context>${JSON.stringify(objects)}</context>`,
            } satisfies ContentBlock.Text,
            {
              _tag: 'text',
              text: `<transcript>${JSON.stringify(message.blocks)}</transcript>`,
            } satisfies ContentBlock.Text,
          ],
        }),
      ],
      artifacts: [],
      prompt: '',
      tools: [],
      toolResolver: new ToolRegistry([]),
    } as any); // TODO(burdon): !!!

    return {
      message: create(DataType.Message, {
        ...message,
        blocks: message.blocks.map((block, i) =>
          block._tag !== 'transcript'
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
