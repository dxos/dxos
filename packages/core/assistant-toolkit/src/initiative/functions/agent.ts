//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { AiContextService, AiConversation } from '@dxos/assistant';
import { Database, Obj, Type } from '@dxos/echo';
import { acquireReleaseResource } from '@dxos/effect';
import { TriggerEvent, defineFunction } from '@dxos/functions';
import { invariant } from '@dxos/invariant';

import * as Initiative from '../InitiativeSchema';

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
  handler: Effect.fnUntraced(function* ({ data }) {
    const initiative = yield* Database.load(data.initiative);
    invariant(Obj.instanceOf(Initiative.Initiative, initiative));
    invariant(initiative.chat, 'Initiative has no chat.');
    const chatQueue = yield* Database.load(initiative.chat!);
    invariant(chatQueue, 'Initiative chat queue not found.');
    const conversation = yield* acquireReleaseResource(() => new AiConversation({ queue: chatQueue as any }));

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

    yield* conversation.createRequest({
      prompt: input,
      // observer: GenerationObserver.fromPrinter(new ConsolePrinter()),
    });
  }, Effect.scoped) as any, // TODO(dmaretskyi): Services don't align -- need to refactor how functions are defined.
});
