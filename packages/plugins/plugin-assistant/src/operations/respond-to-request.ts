//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { SessionConfig } from '@dxos/ai';
import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import { Database, Feed, Filter } from '@dxos/echo';
import { Message } from '@dxos/types';

import { AssistantCapabilities, AssistantOperation } from '#types';

const handler: Operation.WithHandler<typeof AssistantOperation.RespondToRequest> =
  AssistantOperation.RespondToRequest.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ chat, messageId, requestId, optionId }) {
        const harness = SessionConfig.harnessOf(chat.session);
        const agents = yield* Capability.getAll(AssistantCapabilities.Agent);
        const agent = agents.find((agent) => agent.id === harness);
        if (!agent?.respond) {
          return { answered: false };
        }

        const feed = yield* Database.load(chat.feed);
        const messages = yield* Feed.query(feed, Filter.type(Message.Message)).run;
        const message = messages.find((message) => message.id === messageId);
        if (!message) {
          return { answered: false };
        }

        return { answered: yield* agent.respond({ chat, message, requestId, optionId }) };
      }),
    ),
  );

export default handler;
