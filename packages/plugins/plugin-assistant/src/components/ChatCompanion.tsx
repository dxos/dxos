//
// Copyright 2025 DXOS.org
//

import * as Array from 'effect/Array';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as pipe from 'effect/pipe';
import React, { useMemo } from 'react';

import { Capabilities, createIntent, useCapabilities, useIntentDispatcher } from '@dxos/app-framework';
import { Blueprint } from '@dxos/blueprints';
import { getSpace } from '@dxos/client/echo';
import { Filter, Obj, Query, Ref } from '@dxos/echo';
import { DatabaseService } from '@dxos/functions';
import { SpaceAction } from '@dxos/plugin-space/types';
import { useQuery } from '@dxos/react-client/echo';
import { useAsyncEffect } from '@dxos/react-ui';

import { ChatContainer } from '../components';
import { useContextBinder } from '../hooks';
import { Assistant, AssistantAction } from '../types';

export type ChatCompanionProps = {
  role?: string;
  data: { companionTo: Obj.Any; subject: Assistant.Chat | 'assistant-chat' };
};

export const ChatCompanion = ({ role, data }: ChatCompanionProps) => {
  const companionTo = data.companionTo;
  const space = getSpace(companionTo);
  const chat = data.subject === 'assistant-chat' ? undefined : data.subject;
  const binder = useContextBinder(chat);
  const { dispatch } = useIntentDispatcher();

  // Initialize companion chat if it doesn't exist.
  useAsyncEffect(async () => {
    if (chat || !space) {
      return;
    }

    // TODO(burdon): Garbage collection of queues?
    // TODO(wittjosiah): Figure out how to prevent companion chats from showing up in the navtree.
    await Effect.gen(function* () {
      const { objects } = yield* DatabaseService.runQuery(
        Query.select(Filter.ids(companionTo.id)).targetOf(Assistant.CompanionTo).source(),
      );

      // TODO(wittjosiah): This should be the default sort order.
      let nextChat = objects.toSorted((a, b) => a.id.localeCompare(b.id)).at(-1);
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
  }, [space, chat, companionTo]);

  const metadata = useCapabilities(Capabilities.Metadata);
  const blueprintKeys = useMemo(
    () =>
      pipe(
        metadata,
        Array.findFirst(
          (capability): capability is { id: string; metadata: { blueprints?: string[] } } =>
            capability.id === Obj.getTypename(companionTo),
        ),
        Option.flatMap((c) => Option.fromNullable(c.metadata.blueprints)),
        Option.getOrElse(() => [] as string[]),
      ),
    [metadata, companionTo],
  );
  const allBlueprints = useQuery(space, Filter.type(Blueprint.Blueprint));
  const pluginBlueprints = useMemo(
    () => allBlueprints.filter((blueprint) => blueprintKeys.includes(blueprint.key)),
    [allBlueprints, blueprintKeys],
  );

  // TODO(wittjosiah): Occasionally this fails to bind but seems to be an upstream issue.
  //   It seems like the queue object signal emits as an empty array after previously emitting a non-empty array.
  useAsyncEffect(async () => {
    if (!binder) {
      return;
    }

    if (pluginBlueprints.length > 0) {
      await binder.bind({ blueprints: pluginBlueprints.map((blueprint) => Ref.make(blueprint)) });
    }

    if (Obj.instanceOf(Blueprint.Blueprint, companionTo)) {
      await binder.bind({ blueprints: [Ref.make(companionTo)] });
    } else {
      await binder.bind({ objects: [Ref.make(companionTo)] });
    }
  }, [binder, companionTo, pluginBlueprints]);

  if (!chat) {
    return null;
  }

  return <ChatContainer role={role} chat={chat} companionTo={companionTo} />;
};

export default ChatCompanion;
