//
// Copyright 2025 DXOS.org
//

import type * as Chat from '@effect/ai/Chat';
import * as LanguageModel from '@effect/ai/LanguageModel';
import * as Chunk from 'effect/Chunk';
import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';

import { Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import { Message } from '@dxos/types';

import * as AiParser from '../AiParser';
import * as AiPreprocessor from '../AiPreprocessor';
import { callTools, getToolCalls } from '../tools';

import { TestingToolkit, testingLayer } from './toolkit';

// TODO(dmaretskyi): What is the right stopping condition?
export const hasToolCall = Effect.fn(function* (chat: Chat.Service) {
  const history = yield* chat.history;
  const lastMessage = history.content.at(-1);
  return (
    (lastMessage?.role === 'assistant' && lastMessage.content.at(-1)?.type === 'tool-call') ||
    lastMessage?.role === 'tool'
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
  messages?: Message.Message[];
}) {
  const toolkit = yield* TestingToolkit.pipe(Effect.provide(testingLayer));
  const history: Message.Message[] = [...messages];

  do {
    const prompt = yield* AiPreprocessor.preprocessPrompt(history, { system });
    const blocks = yield* LanguageModel.streamText({
      disableToolCallResolution: true,
      toolkit,
      prompt,
    }).pipe(AiParser.parseResponse(), Stream.runCollect, Effect.map(Chunk.toArray));

    const message = Obj.make(Message.Message, {
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
      Obj.make(Message.Message, {
        created: new Date().toISOString(),
        sender: { role: 'user' },
        blocks: toolResults,
      }),
    );
  } while (true);

  return history;
});
