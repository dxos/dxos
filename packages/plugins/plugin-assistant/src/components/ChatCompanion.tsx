//
// Copyright 2025 DXOS.org
//

import { Effect } from 'effect';
import React from 'react';

import { createIntent, useIntentDispatcher } from '@dxos/app-framework';
import { Blueprint } from '@dxos/blueprints';
import { getSpace } from '@dxos/client/echo';
import { Filter, Obj, Query, Ref } from '@dxos/echo';
import { DatabaseService } from '@dxos/functions';
import { SpaceAction } from '@dxos/plugin-space/types';
import { useAsyncEffect } from '@dxos/react-ui';

import { ChatContainer } from '../components';
import { useContextBinder } from '../hooks';
import { Assistant, AssistantAction } from '../types';

export type ChatCompanionProps = {
  role?: string;
  data: { companionTo: Obj.Any; subject: Assistant.Chat | 'assistant-chat' };
};

export const ChatCompanion = ({ role, data }: ChatCompanionProps) => {
  const chat = data.subject === 'assistant-chat' ? undefined : data.subject;
  const binder = useContextBinder(chat);
  const companionTo = data.companionTo;
  const { dispatch } = useIntentDispatcher();

  // Initialize companion chat if it doesn't exist.
  useAsyncEffect(async () => {
    const space = getSpace(companionTo);
    if (chat || !space) {
      return;
    }

    // TODO(burdon): Garbage collection of queues?
    // TODO(wittjosiah): Figure out how to prevent companion chats from showing up in the navtree.
    await Effect.gen(function* () {
      const { objects } = yield* DatabaseService.runQuery(
        Query.select(Filter.ids(companionTo.id)).targetOf(Assistant.CompanionTo).source(),
      );

      let nextChat = objects.at(-1);
      if (!nextChat) {
        const { object } = yield* dispatch(createIntent(AssistantAction.CreateChat, { space }));
        nextChat = object;
        yield* dispatch(createIntent(SpaceAction.AddObject, { object: nextChat, target: space, hidden: true }));
        yield* dispatch(
          createIntent(SpaceAction.AddRelation, {
            space,
            schema: Assistant.CompanionTo,
            source: nextChat,
            target: data.companionTo,
          }),
        );
      }

      yield* dispatch(createIntent(AssistantAction.SetCurrentChat, { companionTo, chat: nextChat }));
    }).pipe(Effect.provide(DatabaseService.layer(space.db)), Effect.runPromise);
  }, [chat, companionTo]);

  // TODO(wittjosiah): Occasionally this fails to bind but seems to be an upstream issue.
  //   It seems like the queue object signal emits as an empty array after previously emitting a non-empty array.
  useAsyncEffect(async () => {
    if (!binder) {
      return;
    }

    if (Obj.instanceOf(Blueprint.Blueprint, companionTo)) {
      await binder.bind({ blueprints: [Ref.make(companionTo)] });
    } else {
      await binder.bind({ objects: [Ref.make(companionTo)] });
    }
  }, [binder, companionTo]);

  if (!chat) {
    return null;
  }

  return <ChatContainer role={role} chat={chat} companionTo={companionTo} />;
};

export default ChatCompanion;
