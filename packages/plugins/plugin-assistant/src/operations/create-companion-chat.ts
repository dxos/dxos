//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Chat } from '@dxos/assistant-toolkit';
import * as Operation from '@dxos/compute/Operation';
import { Obj } from '@dxos/echo';
import { invariant } from '@dxos/invariant';

import { AssistantOperation } from '#types';

const handler: Operation.WithHandler<typeof AssistantOperation.CreateCompanionChat> =
  AssistantOperation.CreateCompanionChat.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ companionTo }) {
        const db = Obj.getDatabase(companionTo);
        invariant(db, 'Subject is not in a database.');

        // Persisted, unlike the transient chat `EnsureCompanionChat` provisions: an explicit new-chat
        // click should put the chat in the navtree before the user has typed anything.
        const { object: chat } = yield* Operation.invoke(AssistantOperation.CreateChat, { db });

        // Parent edge: the chat belongs to its subject, cascades on delete, and stays out of the
        // standalone Chats section.
        Chat.linkCompanion({ chat, subject: companionTo });
        yield* Operation.invoke(AssistantOperation.BindChatContext, { chat, subject: companionTo });
        yield* Operation.invoke(AssistantOperation.SetCurrentChat, { companionTo, chat });
        yield* Effect.promise(() => db.flush());

        return { chat };
      }),
    ),
  );

export default handler;
