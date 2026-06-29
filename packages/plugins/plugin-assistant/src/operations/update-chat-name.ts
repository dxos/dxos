//
// Copyright 2025 DXOS.org
//

import * as LanguageModel from '@effect/ai/LanguageModel';
import * as Prompt from '@effect/ai/Prompt';
import * as Effect from 'effect/Effect';

import { AiPreprocessor, AiService } from '@dxos/ai';
import { Operation } from '@dxos/compute';
import { Database, Feed, Filter, Obj } from '@dxos/echo';
import { DXN } from '@dxos/keys';
import { log } from '@dxos/log';
import { Message } from '@dxos/types';
import { trim } from '@dxos/util';

import { AssistantOperation } from '#types';

const handler: Operation.WithHandler<typeof AssistantOperation.UpdateChatName> = AssistantOperation.UpdateChatName.pipe(
  Operation.withHandler(
    Effect.fnUntraced(
      function* ({ chat, prompt: initialPrompt }) {
        log.info('updating chat name', { chat });

        const system = trim`
          It is extremely important that you respond only with the title and nothing else.
          Do not use markdown or other formatting.
          If you cannot do this effectively respond with "New Chat".

          <example_reply>
          Fishing Trip
          </example_reply>
        `;

        let namePrompt: Prompt.Prompt;
        if (initialPrompt) {
          // Use the provided prompt text directly; the feed may not have messages yet.
          namePrompt = Prompt.setSystem(
            Prompt.make(`User's first message: "${initialPrompt}"\n\nSuggest a name for this chat.`),
            system,
          );
        } else {
          const feed = yield* Database.load(chat.feed);
          const history = yield* Feed.runQuery(feed, Filter.type(Message.Message));
          log.info('history', { history: history.length });
          const historyPrompt = yield* AiPreprocessor.preprocessPrompt(history, {
            system,
            cacheControl: 'ephemeral',
          });
          namePrompt = Prompt.merge(historyPrompt, 'Suggest a name for this chat');
        }

        const response = yield* LanguageModel.generateText({ prompt: namePrompt });
        const newName = response.text.replaceAll(/[^a-zA-Z0-9\s]/g, '').trim();

        Obj.update(chat, (chat) => {
          chat.name = newName;
        });
        log.info('chat name updated', { chat, newName: chat.name });
      },
      Effect.provide(AiService.model(DXN.make('com.anthropic.model.claudeHaiku45'))),
    ),
  ),
);

export default handler;
