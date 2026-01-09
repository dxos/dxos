//
// Copyright 2025 DXOS.org
//

import * as Array from 'effect/Array';
import * as Function from 'effect/Function';
import * as Option from 'effect/Option';
import React, { forwardRef, useCallback, useEffect, useMemo, useState } from 'react';

import { Common, createIntent } from '@dxos/app-framework';
import { useCapabilities, useIntentDispatcher } from '@dxos/app-framework/react';
import { Blueprint } from '@dxos/blueprints';
import { getSpace } from '@dxos/client/echo';
import { Filter, Obj, Ref } from '@dxos/echo';
import { SpaceAction } from '@dxos/plugin-space/types';
import { useQuery } from '@dxos/react-client/echo';
import { useAsyncEffect } from '@dxos/react-ui';

import { ChatContainer, type ChatEvent } from '../components';
import { useBlueprintRegistry, useContextBinder } from '../hooks';
import { Assistant, AssistantAction } from '../types';

export type ChatCompanionProps = {
  role?: string;
  data: {
    subject: Assistant.Chat | 'assistant-chat';
    companionTo: Obj.Any;
  };
};

export const ChatCompanion = forwardRef<HTMLDivElement, ChatCompanionProps>(
  ({ role, data }: ChatCompanionProps, forwardedRef) => {
    const { dispatchPromise: dispatch } = useIntentDispatcher();
    const blueprintRegistry = useBlueprintRegistry();
    const companionTo = data.companionTo;

    const space = getSpace(companionTo);
    const [chat, setChat] = useState(data.subject === 'assistant-chat' ? undefined : data.subject);
    useEffect(() => {
      setChat(data.subject === 'assistant-chat' ? undefined : data.subject);
    }, [data.subject]);

    const chatQueue = space && chat ? space.queues.get(chat.queue.dxn) : undefined;
    const binder = useContextBinder(chatQueue);

    // Initialize companion chat if it doesn't exist, but don't add it to the space immediately.
    useAsyncEffect(async () => {
      if (!space || chat) {
        return;
      }

      const { data } = await dispatch(createIntent(AssistantAction.CreateChat, { db: space.db }));
      setChat(data?.object);
    }, [chat, space]);

    // Add chat to space when user submits the first message.
    const handleEvent = useCallback(
      async (event: ChatEvent) => {
        const chatInSpace = !!getSpace(chat);
        if (chatInSpace || !chat || !space) {
          return;
        }

        if (event.type === 'submit') {
          await dispatch(
            createIntent(SpaceAction.AddObject, {
              object: chat,
              target: space.db,
              hidden: true,
            }),
          );
          await dispatch(
            createIntent(SpaceAction.AddRelation, {
              db: space.db,
              schema: Assistant.CompanionTo,
              source: chat,
              target: companionTo,
            }),
          );
          await dispatch(
            createIntent(AssistantAction.SetCurrentChat, {
              companionTo,
              chat,
            }),
          );
        }
      },
      [chat, space, companionTo, dispatch],
    );

    const metadata = useCapabilities(Common.Capability.Metadata);
    const blueprintKeys = useMemo(
      () =>
        Function.pipe(
          metadata,
          Array.findFirst(
            (
              capability,
            ): capability is {
              id: string;
              metadata: { blueprints?: string[] };
            } => capability.id === Obj.getTypename(companionTo),
          ),
          Option.flatMap((c) => Option.fromNullable(c.metadata.blueprints)),
          Option.getOrElse(() => [] as string[]),
        ),
      [metadata, companionTo],
    );
    const existingBlueprints = useQuery(space?.db, Filter.type(Blueprint.Blueprint));
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
      const existingBlueprints = await space.db.query(Filter.type(Blueprint.Blueprint)).run();
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
        await binder.bind({
          blueprints: pluginBlueprints.map((blueprint) => Ref.make(blueprint)),
        });
      }

      if (Obj.instanceOf(Blueprint.Blueprint, companionTo)) {
        await binder.bind({ blueprints: [Ref.make(companionTo)] });
      } else {
        await binder.bind({ objects: [Ref.make(companionTo)] });
      }
    }, [binder, companionTo, blueprintKeys]);

    return (
      <ChatContainer
        role={role}
        space={space}
        chat={chat}
        companionTo={companionTo}
        onEvent={handleEvent}
        ref={forwardedRef}
      />
    );
  },
);

export default ChatCompanion;
