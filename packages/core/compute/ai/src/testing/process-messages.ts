//
// Copyright 2025 DXOS.org
//

import type { AiError, Tool } from '@effect/ai';
import type * as Chat from '@effect/ai/Chat';
import * as LanguageModel from '@effect/ai/LanguageModel';
import * as Toolkit from '@effect/ai/Toolkit';
import * as Chunk from 'effect/Chunk';
import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';

import { Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import { Message } from '@dxos/types';

import * as AiParser from '../AiParser';
import * as AiPreprocessor from '../AiPreprocessor';
import type { PromptPreprocessingError } from '../errors';
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
  return yield* agenticLoop({ system, messages, toolkit: TestingToolkit });
});

export const agenticLoop: {
  <Tools extends Record<string, Tool.Any> = {}>(opts: {
    system?: string;
    messages?: Message.Message[];
    toolkit?: Toolkit.Toolkit<Tools>;
  }): Effect.Effect<
    Message.Message[],
    PromptPreprocessingError | AiError.AiError,
    LanguageModel.LanguageModel | Tool.Requirements<Tools>
  >;
} = Effect.fn('agenticLoop')(function* (opts) {
  const tk: Toolkit.Toolkit<{}> = opts.toolkit ?? (Toolkit.make() as any);
  const toolkit = yield* tk.pipe(Effect.provide(testingLayer));
  const history: Message.Message[] = [...(opts.messages ?? [])];

  do {
    const prompt = yield* AiPreprocessor.preprocessPrompt(history, { system: opts.system });
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
    log.info('toolResults', { toolResults });
    history.push(
      Obj.make(Message.Message, {
        created: new Date().toISOString(),
        sender: { role: 'tool' },
        blocks: toolResults,
      }),
    );
  } while (true);

  return history;
});
