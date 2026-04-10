//
// Copyright 2025 DXOS.org
//

import { LanguageModel, Prompt } from '@effect/ai';
import * as Effect from 'effect/Effect';

import { AiPreprocessor, AiService } from '@dxos/ai';
import { Database, Feed, Filter, Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import { Operation } from '@dxos/operation';
import { Message } from '@dxos/types';
import { trim } from '@dxos/util';

import { UpdateChatName } from './definitions';

const handler: Operation.WithHandler<typeof UpdateChatName> = UpdateChatName.pipe(
  Operation.withHandler(
    Effect.fnUntraced(
      function* ({ chat }) {
        log.info('updating chat name', { chat });

        const feed = yield* Database.load(chat.feed);
        const history = yield* Feed.runQuery(feed, Filter.type(Message.Message));

        log.info('history', { history: history.length });

        const system = trim`
          It is extremely important that you respond only with the title and nothing else.
          Do not use markdown or other formatting.
          If you cannot do this effectively respond with "New Chat".

          <example_reply>
          Fishing Trip
          </example_reply>
        `;
        const prompt = 'Suggest a name for this chat';

        const historyPrompt = yield* AiPreprocessor.preprocessPrompt(history, {
          system,
          cacheControl: 'ephemeral',
        });

        const response = yield* LanguageModel.generateText({
          prompt: Prompt.merge(historyPrompt, prompt),
        });

        const newName = response.text.replaceAll(/[^a-zA-Z0-9\s]/g, '').trim();

        Obj.change(chat, (chat) => {
          chat.name = newName;
        });
        log.info('chat name updated', { chat, newName: chat.name });
      },
      Effect.provide(AiService.model('@anthropic/claude-haiku-4-5')),
    ),
  ),
);

export default handler;
