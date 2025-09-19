//
// Copyright 2025 DXOS.org
//

// ISSUE(burdon): defineFunction
// @ts-nocheck
import { Effect, Layer } from 'effect';

import { AiService, ConsolePrinter, ToolExecutionService, ToolResolverService } from '@dxos/ai';
import { Obj } from '@dxos/echo';
import { create } from '@dxos/echo-schema';
import { type FunctionDefinition, defineFunction } from '@dxos/functions';
import { type ContentBlock, DataType } from '@dxos/schema';

import { AiSession, GenerationObserver } from '../../session';
import { ExtractionInput, ExtractionOutput } from '../extraction';
import { insertReferences } from '../quotes';

import PROMPT from './instructions.tpl?raw';

export const extractionAnthropicFn: FunctionDefinition<ExtractionInput, ExtractionOutput> = defineFunction({
  description: 'Extract entities from the transcript message and add them to the message.',
  inputSchema: ExtractionInput,
  outputSchema: ExtractionOutput,
  handler: Effect.fnUntraced(
    function* ({ data: { message, objects } }) {
      const startTime = performance.now();
      const session = new AiSession({ operationModel: 'configured' });
      const result = yield* session.run({
        system: PROMPT,
        history: [
          Obj.make(DataType.Message, {
            created: new Date().toISOString(),
            sender: { role: 'user' },
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
            observer: GenerationObserver.fromPrinter(new ConsolePrinter({ tag: 'extraction' })),
          }),
        ],
      });

      return {
        message: create(DataType.Message, {
          ...message,
          blocks: message.blocks.map((block) =>
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
    Effect.provide(
      Layer.mergeAll(
        AiService.model('@anthropic/claude-3-5-haiku-20241022'),
        ToolResolverService.layerEmpty,
        ToolExecutionService.layerEmpty,
      ),
    ),
  ),
});
