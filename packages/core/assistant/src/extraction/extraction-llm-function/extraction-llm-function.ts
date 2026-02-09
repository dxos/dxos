//
// Copyright 2025 DXOS.org
//

import { type FunctionDefinition, defineFunction } from '@dxos/functions';

import { ExtractionInput, ExtractionOutput } from '../extraction';

export const extractionAnthropicFunction: FunctionDefinition<ExtractionInput, ExtractionOutput> = defineFunction({
  key: 'dxos.org/function/extraction/extract-entities',
  name: 'Extract Entities',
  description: 'Extract entities from the transcript message and add them to the message.',
  inputSchema: ExtractionInput,
  outputSchema: ExtractionOutput,
  handler: async ({ data: { message, objects }, context }) => {
    throw new Error('not implemented');
    // const startTime = performance.now();
    // const ai = context.getService(AiService.AiService);
    // const session = new AiSession({ operationModel: 'configured' });
    // const result = await session.runStructured(ReferencedQuotes, {
    //   generationOptions: {
    //     model: '@anthropic/claude-3-5-haiku-20241022',
    //   },
    //   client: ai.client,
    //   systemPrompt: PROMPT,
    //   history: [
    //     Obj.make(DataType.Message.Message, {
    //       created: new Date().toISOString(),
    //       sender: { role: 'user' },
    //       blocks: [
    //         {
    //           _tag: 'text',
    //           text: `<context>${JSON.stringify(objects)}</context>`,
    //         } satisfies DataType.ContentBlock.Text,
    //         {
    //           _tag: 'text',
    //           text: `<transcript>${JSON.stringify(message.blocks)}</transcript>`,
    //         } satisfies DataType.ContentBlock.Text,
    //       ],
    //     }),
    //   ],
    //   artifacts: [],
    //   prompt: '',
    //   tools: [],
    // } as any); // TODO(burdon): Rewrite test.

    // return {
    //   timeElapsed: performance.now() - startTime,
    //   message: create(DataType.Message.Message, {
    //     ...message,
    //     blocks: message.blocks.map((block) =>
    //       block._tag !== 'transcript'
    //         ? block
    //         : {
    //             ...block,
    //             text: insertReferences(block.text, result),
    //           },
    //     ),
    //   }),
    // };
  },
});
