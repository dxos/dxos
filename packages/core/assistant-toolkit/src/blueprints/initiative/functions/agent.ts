//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { AiService } from '@dxos/ai';
import { AiContextService, AiConversation, type ContextBinding } from '@dxos/assistant';
import { Database, Obj, Type } from '@dxos/echo';
import { type Queue } from '@dxos/echo-db';
import { acquireReleaseResource } from '@dxos/effect';
import { TriggerEvent, defineFunction } from '@dxos/functions';
import { invariant } from '@dxos/invariant';
import { type Message } from '@dxos/types';

import { Initiative } from '../../../types';

export default defineFunction({
  key: 'dxos.org/function/initiative/agent',
  name: 'Initiative Agent',
  description: 'Agentic worker that drives the initiative autonomously.',
  inputSchema: Schema.Struct({
    initiative: Schema.suspend(() => Type.Ref(Initiative.Initiative)),
    prompt: Schema.optional(Schema.String),
    event: Schema.optional(TriggerEvent.TriggerEvent),
  }),
  outputSchema: Schema.Void,
  services: [AiContextService],
  handler: Effect.fnUntraced(
    function* ({ data }) {
      const initiative = yield* Database.load(data.initiative);
      invariant(Obj.instanceOf(Initiative.Initiative, initiative));
      invariant(initiative.chat, 'Initiative has no chat.');

      if (initiative.newChatOnEveryEvent) {
        yield* Initiative.resetChatHistory(initiative);
      }

      const chatQueue = yield* initiative.chat.pipe(
        Database.load,
        Effect.flatMap((chat) => Database.load(chat.queue)),
      );
      invariant(chatQueue, 'Initiative chat queue not found.');
      const conversation = yield* acquireReleaseResource(
        () => new AiConversation({ queue: chatQueue as Queue<Message.Message | ContextBinding> }),
      );

      const iniativesInContext = conversation.context.getObjects().filter(Obj.instanceOf(Initiative.Initiative));
      if (iniativesInContext.length !== 1) {
        throw new Error('There should be exactly one initiative in context. Got: ' + iniativesInContext.length);
      }

      if (!data.prompt && !data.event) {
        throw new Error('Either prompt or event must be provided.');
      }

      let input = '';
      if (data.prompt) {
        input += `${data.prompt}\n\n`;
      }
      if (data.event) {
        input += `<event>\n${JSON.stringify(data.event, null, 2)}\n</event>\n\n`;
      }

      yield* conversation
        .createRequest({
          prompt: input,
        })
        .pipe(Effect.retry({ times: 2 }));
    },
    Effect.scoped,
    Effect.provide(AiService.model('@anthropic/claude-sonnet-4-5')),
    AiContextService.fixFunctionHandlerType,
  ) as any,
});
