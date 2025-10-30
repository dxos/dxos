//
// Copyright 2025 DXOS.org
//

import * as Array from 'effect/Array';
import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Option from 'effect/Option';
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
import { useBlueprintRegistry, useContextBinder } from '../hooks';
import { Assistant, AssistantAction } from '../types';

export type ChatCompanionProps = {
  role?: string;
  data: { subject: Assistant.Chat | 'assistant-chat'; companionTo: Obj.Any };
};

export const ChatCompanion = ({ role, data }: ChatCompanionProps) => {
  const companionTo = data.companionTo;
  const space = getSpace(companionTo);
  const chat = data.subject === 'assistant-chat' ? undefined : data.subject;
  const blueprintRegistry = useBlueprintRegistry();
  const binder = useContextBinder(chat);
  const { dispatch } = useIntentDispatcher();

  // Initialize companion chat if it doesn't exist.
  useAsyncEffect(async () => {
    if (chat || !space) {
      return;
    }

    // TODO(burdon): Garbage collection of queues?
    await Effect.gen(function* () {
      const { objects } = yield* DatabaseService.runQuery(
        Query.select(Filter.ids(companionTo.id)).targetOf(Assistant.CompanionTo).source(),
      );

      // TODO(wittjosiah): This should be the default sort order.
      let nextChat = objects.toSorted(({ id: a }, { id: b }) => a.localeCompare(b)).at(-1);
      if (!nextChat) {
        ({ object: nextChat } = yield* dispatch(createIntent(AssistantAction.CreateChat, { space })));

        // TODO(burdon): Lazily add to space and companionTo.
        yield* dispatch(
          createIntent(SpaceAction.AddObject, {
            object: nextChat,
            target: space,
            hidden: true,
          }),
        );
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
      Function.pipe(
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
  const existingBlueprints = useQuery(space, Filter.type(Blueprint.Blueprint));
  const pluginBlueprints = useMemo(
    () => existingBlueprints.filter((blueprint) => blueprintKeys.includes(blueprint.key)),
    [existingBlueprints, blueprintKeys],
  );

  // Initialize related blueprints that are not already in the space.
  useAsyncEffect(async () => {
    if (!space) {
      return;
    }

    // NOTE: This must be run instead of using the useQuery result to avoid duplicates.
    const { objects: existingBlueprints } = await space.db.query(Filter.type(Blueprint.Blueprint)).run();
    for (const key of blueprintKeys) {
      const existingBlueprint = existingBlueprints.find((blueprint) => blueprint.key === key);
      if (existingBlueprint) {
        continue;
      }

      const blueprint = blueprintRegistry.getByKey(key);
      if (!blueprint) {
        continue;
      }

      space.db.add(Obj.clone(blueprint));
    }
  }, [space, blueprintRegistry, blueprintKeys]);

  useAsyncEffect(async () => {
    if (!binder?.isOpen) {
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
  }, [binder, companionTo, blueprintKeys]);

  return <ChatContainer role={role} chat={chat} companionTo={companionTo} />;
};

export default ChatCompanion;
