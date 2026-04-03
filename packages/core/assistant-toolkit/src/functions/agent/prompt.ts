//
// Copyright 2025 DXOS.org
//

import * as Array from 'effect/Array';
import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Option from 'effect/Option';

import { AiService, ConsolePrinter, ModelName } from '@dxos/ai';
import { AiConversation, type ContextBinding, AiSession, GenerationObserver, createToolkit } from '@dxos/assistant';
import { Template } from '@dxos/blueprints';
import { Database, Obj, Ref } from '@dxos/echo';
import { type Queue } from '@dxos/echo-db';
import { acquireReleaseResource } from '@dxos/effect';
import { TracingService } from '@dxos/functions';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { Operation } from '@dxos/operation';
import { type Message } from '@dxos/types';

import { AgentPrompt } from './definitions';

import * as Chat from '../../types/Chat';

const DEFAULT_MODEL: ModelName = '@anthropic/claude-opus-4-0';

const observer = GenerationObserver.fromPrinter(new ConsolePrinter({ tag: 'agent' }));

const lastTextFromMessages = (messages: Message.Message[]): string | undefined => {
  const blocks = messages.flatMap((message) => message.blocks);
  for (let index = blocks.length - 1; index >= 0; index--) {
    const block = blocks[index]!;
    if (block._tag === 'text') {
      return block.text;
    }
  }
  return undefined;
};

const handler: Operation.WithHandler<typeof AgentPrompt> = AgentPrompt.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (data) {
      log.info('processing input', { input: data.input });

      const input = yield* Ref.isRef(data.input)
        ? Database.load(data.input).pipe(Effect.map(Obj.toJSON))
        : Effect.succeed(data.input);

      yield* Database.flush();
      const prompt = yield* Database.load(data.prompt);
      const systemPrompt = data.systemPrompt ? yield* Database.load(data.systemPrompt) : undefined;
      yield* TracingService.emitStatus({ message: `Running ${prompt.id}` });

      log.info('starting agent', { prompt: prompt.id, input });

      const blueprints = yield* Function.pipe(
        prompt.blueprints,
        Array.appendAll(systemPrompt?.blueprints ?? []),
        Effect.forEach(Database.loadOption),
        Effect.map(Array.filter(Option.isSome)),
        Effect.map(Array.map((option) => option.value)),
      );

      const objects = yield* Function.pipe(
        prompt.context,
        Array.appendAll(systemPrompt?.context ?? []),
        Effect.forEach(Database.loadOption),
        Effect.map(Array.filter(Option.isSome)),
        Effect.map(Array.map((option) => option.value)),
      );

      const subPrompts = yield* Function.pipe(
        prompt.prompts ?? [],
        Array.appendAll(systemPrompt?.prompts ?? []),
        Effect.forEach(Database.loadOption),
        Effect.map(Array.filter(Option.isSome)),
        Effect.map(Array.map((option) => option.value)),
      );

      const promptInstructions = yield* Database.load(prompt.instructions.source);
      const promptText = Template.process(promptInstructions.content, input);

      const systemInstructions = systemPrompt ? yield* Database.load(systemPrompt.instructions.source) : undefined;
      const systemText = systemInstructions ? Template.process(systemInstructions.content, {}) : undefined;

      const modelLayer = AiService.model(data.model ?? DEFAULT_MODEL);

      if (data.chat) {
        const chat = yield* Database.load(data.chat);
        invariant(Obj.instanceOf(Chat.Chat, chat), 'Expected Chat object.');
        const chatQueue = yield* Database.load(chat.queue);
        invariant(chatQueue, 'Chat queue not found.');

        const conversation = yield* acquireReleaseResource(
          () => new AiConversation({ queue: chatQueue as Queue<Message.Message | ContextBinding> }),
        );

        yield* Effect.promise(() =>
          conversation.context.bind({
            blueprints: blueprints.map((blueprint) => Ref.make(blueprint)),
            objects: objects.map((object) => Ref.make(object as Obj.Unknown)),
          }),
        );

        const messages = yield* conversation
          .createRequest({
            prompt: promptText,
            system: systemText,
            observer,
          })
          .pipe(Effect.provide(modelLayer));

        return {
          note: lastTextFromMessages(messages),
        };
      }

      const toolkit = yield* createToolkit({ blueprints, prompts: subPrompts });

      const session = new AiSession({ observer });
      const result = yield* session
        .run({
          prompt: promptText,
          system: systemText,
          blueprints,
          objects: objects as Obj.Unknown[],
          toolkit,
        })
        .pipe(Effect.provide(modelLayer));

      return {
        note: lastTextFromMessages(result),
      };
    }, Effect.scoped),
  ),
);

export default handler;
