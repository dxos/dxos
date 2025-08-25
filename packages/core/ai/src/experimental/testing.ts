//
// Copyright 2025 DXOS.org
//

import { type AiChat, AiLanguageModel } from '@effect/ai';
import { Chunk, Effect, Stream } from 'effect';

import { Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import { DataType } from '@dxos/schema';

import { parseResponse } from '../AiParser';
import { preprocessAiInput } from '../AiPreprocessor';
import { TestingToolkit, testingLayer } from '../testing';
import { callTools, getToolCalls } from '../tools';

// TODO(dmaretskyi): What is the right stopping condition?
export const hasToolCall = Effect.fn(function* (chat: AiChat.AiChat.Service) {
  const history = yield* chat.history;
  return (
    history.messages.at(-1)?.parts.at(-1)?._tag === 'ToolCallPart' ||
    history.messages.at(-1)?.parts.at(-1)?._tag === 'ToolCallResultPart'
  );
});

/**
 * Tool processing loop.
 */
export const processMessages = Effect.fn(function* ({
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
