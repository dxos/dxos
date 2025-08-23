//
// Copyright 2025 DXOS.org
//

import { AiLanguageModel } from '@effect/ai';
import { describe, it } from '@effect/vitest';
import { Chunk, Effect, Layer, Stream } from 'effect';

import { Obj } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect';
import { log } from '@dxos/log';
import { DataType } from '@dxos/schema';
import { trim } from '@dxos/util';

import { parseResponse } from '../AiParser';
import { preprocessAiInput } from '../AiPreprocessor';
import * as AiService from '../AiService';
import { AiServiceTestingPreset, TestingToolkit, testingLayer } from '../testing';
import { callTools, getToolCalls } from '../tools';

describe('effect AI tool calls', () => {
  it.effect(
    'calculator',
    Effect.fn(
      function* ({ expect }) {
        const messages = yield* processMessages({
          messages: [
            Obj.make(DataType.Message, {
              created: new Date().toISOString(),
              sender: { role: 'user' },
              blocks: [{ _tag: 'text', text: 'What is 2 + 2?' }],
            }),
          ],
        });

        expect(messages.length).toBeGreaterThan(1);
      },
      Effect.provide(
        Layer.mergeAll(
          AiService.model('@anthropic/claude-3-5-sonnet-20241022').pipe(
            Layer.provideMerge(AiServiceTestingPreset('direct')),
          ),
        ),
      ),
      TestHelpers.runIf(process.env.ANTHROPIC_API_KEY),
    ),
  );

  const parts = ['`---`', '`+++`', '`@@`'];

  it.effect(
    'markdown',
    Effect.fn(
      function* ({ expect }) {
        const messages = yield* processMessages({
          system: trim`
            You are a helpful assistant.
            You are an assistant that edits text documents.
            When I give you a document and an editing request, you must return ONLY a unified diff (patch) that applies the requested changes.

            Rules:
            - Use standard unified diff format (${parts.join(', ')}) with context lines.
            - Do not output the full file, only the diff.
            - Do not include explanations or extra text outside the diff.

            Example:
            --- old.txt
            +++ new.txt
            @@ -1,3 +1,4 @@
            The quick brown fox
            -jumps over the dog.
            +jumps over the lazy dog.
            +It looks very happy.
          `,
          messages: [
            Obj.make(DataType.Message, {
              created: new Date().toISOString(),
              sender: { role: 'user' },
              blocks: [{ _tag: 'text', text: 'Read the document test.md and fix spelling mistakes' }],
            }),
          ],
        });

        expect(messages.length).toBeGreaterThan(1);
      },
      Effect.provide(
        Layer.mergeAll(
          AiService.model('@anthropic/claude-3-5-sonnet-20241022').pipe(
            Layer.provideMerge(AiServiceTestingPreset('direct')),
          ),
        ),
      ),
      TestHelpers.runIf(process.env.ANTHROPIC_API_KEY),
    ),
  );
});

/**
 * Tool processing loop.
 */
const processMessages = Effect.fn(function* ({
  system = 'You are a helpful assistant.',
  messages = [],
}: {
  system?: string;
  messages?: DataType.Message[];
}) {
  const toolkit = yield* TestingToolkit.pipe(Effect.provide(testingLayer));
  const history: DataType.Message[] = [...messages];

  do {
    const prompt = yield* preprocessAiInput(history);
    const blocks = yield* AiLanguageModel.streamText({
      disableToolCallResolution: true,
      toolkit,
      system,
      prompt,
    }).pipe(parseResponse(), Stream.runCollect, Effect.map(Chunk.toArray));

    const message = Obj.make(DataType.Message, {
      created: new Date().toISOString(),
      sender: { role: 'assistant' },
      blocks,
    });
    history.push(message);
    log.info('message', { message });

    const toolCalls = getToolCalls(message);
    if (toolCalls.length === 0) {
      break;
    }

    log.info('toolCalls', { toolCalls });
    const toolResults = yield* callTools(toolkit, toolCalls);
    history.push(
      Obj.make(DataType.Message, {
        created: new Date().toISOString(),
        sender: { role: 'user' },
        blocks: toolResults,
      }),
    );
  } while (true);

  return history;
});
