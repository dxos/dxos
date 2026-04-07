//
// Copyright 2025 DXOS.org
//

import * as Array from 'effect/Array';
import * as Function from 'effect/Function';
import * as Option from 'effect/Option';
import React, { forwardRef, useCallback, useEffect, useMemo, useState } from 'react';

import { useAtomCapability, useCapabilities, useOperationInvoker } from '@dxos/app-framework/ui';
import { AppCapabilities } from '@dxos/app-toolkit';
import { Chat } from '@dxos/assistant-toolkit';
import { Blueprint } from '@dxos/blueprints';
import { getSpace } from '@dxos/client/echo';
import { DXN, Filter, Obj, Ref } from '@dxos/echo';
import { SpaceOperation } from '@dxos/plugin-space/operations';
import { useQuery } from '@dxos/react-client/echo';
import { useAsyncEffect } from '@dxos/react-ui';

import { type ChatEvent } from '../../components';
import { useBlueprintRegistry, useContextBinder } from '../../hooks';
import { Assistant, AssistantCapabilities } from '../../types';
import { AssistantOperation } from '../../operations';
import ChatContainer from '../ChatContainer';

// TODO(burdon): Use definition.
// export type ChatCompanionProps = ObjectSurfaceProps<Chat.Chat>;

export type ChatCompanionProps = {
  role?: string;
  data: {
    subject: Chat.Chat | 'assistant-chat';
    attendableId: string;
    companionTo: Obj.Unknown;
  };
};

export const ChatCompanion = forwardRef<HTMLDivElement, ChatCompanionProps>(
  ({ role, data }: ChatCompanionProps, forwardedRef) => {
    const { invokePromise } = useOperationInvoker();
    const blueprintRegistry = useBlueprintRegistry();

    const companionTo = data.companionTo;
    const space = getSpace(companionTo);
    const [chat, setChat] = useState(data.subject === 'assistant-chat' ? undefined : data.subject);

    const state = useAtomCapability(AssistantCapabilities.State);
    const companionToId = Obj.getDXN(companionTo).toString();
    const currentChatState = state?.currentChat[companionToId];

    // Resolve chat from state or data.subject, and ensure a companion chat exists.
    useEffect(() => {
      if (!currentChatState && chat && getSpace(chat)) {
        // State cleared (new thread) — drop the persisted chat so ensure-companion-chat creates a fresh transient.
        setChat(undefined);
      } else if (data.subject !== 'assistant-chat') {
        setChat(data.subject);
      } else if (currentChatState && space) {
        const currentChatDxnStr = chat ? Obj.getDXN(chat).toString() : undefined;
        if (currentChatState !== currentChatDxnStr) {
          const parsedDxn = DXN.tryParse(currentChatState);
          if (parsedDxn) {
            const chatRef = space.db.makeRef(parsedDxn);
            const resolvedChat = chatRef?.target;
            if (Obj.instanceOf(Assistant.Chat, resolvedChat)) {
              setChat(resolvedChat);
            }
          }
        }
      }
    }, [currentChatState, data.subject, space, chat]);

    // When there is no chat, use the centralized ensure-companion-chat operation.
    useAsyncEffect(async () => {
      if (!space || chat) {
        return;
      }

      const { data: result } = await invokePromise(AssistantOperation.EnsureCompanionChat, {
        db: space.db,
        companionTo,
      });
      if (result) {
        setChat(result.chat);
      }
    }, [chat, space, companionTo, invokePromise]);

    const chatQueue = space && chat ? space.queues.get(chat.queue.dxn) : undefined;
    const binder = useContextBinder(chatQueue);

    // Persist chat on first submit.
    const handleEvent = useCallback(
      async (event: ChatEvent) => {
        if (!chat || !space) {
          return;
        }

        if (event.type === 'submit' && !getSpace(chat)) {
          await invokePromise(SpaceOperation.AddObject, {
            object: chat,
            target: space.db,
            hidden: true,
          });
          await invokePromise(SpaceOperation.AddRelation, {
            db: space.db,
            schema: Chat.CompanionTo,
            source: chat,
            target: companionTo,
          });
          await invokePromise(AssistantOperation.SetCurrentChat, {
            companionTo,
            chat,
          });
        }
      },
      [chat, space, companionTo, invokePromise],
    );

    const metadata = useCapabilities(AppCapabilities.Metadata);
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

        space.db.add(Obj.clone(blueprint, { deep: true }));
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
        attendableId={data.attendableId}
        space={space}
        subject={chat}
        companionTo={companionTo}
        onEvent={handleEvent}
        ref={forwardedRef}
      />
    );
  },
);
