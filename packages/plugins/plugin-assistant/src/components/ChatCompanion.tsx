//
// Copyright 2025 DXOS.org
//

import * as Array from 'effect/Array';
import * as Function from 'effect/Function';
import * as Option from 'effect/Option';
import React, { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Common } from '@dxos/app-framework';
import { useAtomCapability, useCapabilities, useOperationInvoker } from '@dxos/app-framework/react';
import { Chat } from '@dxos/assistant-toolkit';
import { Blueprint } from '@dxos/blueprints';
import { getSpace } from '@dxos/client/echo';
import { DXN, Filter, Obj, Query, Ref } from '@dxos/echo';
import { SpaceOperation } from '@dxos/plugin-space/types';
import { useQuery } from '@dxos/react-client/echo';
import { useAsyncEffect } from '@dxos/react-ui';

import { ChatContainer, type ChatEvent } from '../components';
import { useBlueprintRegistry, useContextBinder } from '../hooks';
import { Assistant, AssistantCapabilities, AssistantOperation } from '../types';

export type ChatCompanionProps = {
  role?: string;
  data: {
    subject: Chat.Chat | 'assistant-chat';
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

    // Watch the state atom directly to detect when plus button clears the chat selection.
    const state = useAtomCapability(AssistantCapabilities.State);
    const companionToId = Obj.getDXN(companionTo).toString();
    const currentChatState = state?.currentChat[companionToId];

    // Track if initial setup has been done (to distinguish initial mount from plus button click).
    // Reset when companionTo changes.
    const initialSetupDoneRef = useRef(false);
    const prevCompanionToIdRef = useRef(companionToId);
    if (prevCompanionToIdRef.current !== companionToId) {
      initialSetupDoneRef.current = false;
      prevCompanionToIdRef.current = companionToId;
    }

    // Sync local chat state with the state atom.
    // When currentChatState is undefined (plus button clicked), reset local chat.
    // When data.subject is a Chat object, use it directly.
    // When currentChatState is a different chat, fetch and set it.
    useEffect(() => {
      // If state says no chat selected AND current chat is persisted, reset local state (handles plus button click).
      // Don't reset in-memory chats - they're expected to have currentChatState === undefined.
      if (!currentChatState && chat && getSpace(chat)) {
        setChat(undefined);
      } else if (data.subject !== 'assistant-chat') {
        // If data.subject is a Chat object (resolved from graph), use it.
        setChat(data.subject);
      } else if (currentChatState && space) {
        // currentChatState is set but graph couldn't resolve it - fetch manually.
        const currentChatDxnStr = chat ? Obj.getDXN(chat).toString() : undefined;
        if (currentChatState !== currentChatDxnStr) {
          // Parse DXN and fetch the chat object from the database.
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

    const chatQueue = space && chat ? space.queues.get(chat.queue.dxn) : undefined;
    const binder = useContextBinder(chatQueue);

    // Initialize companion chat if it doesn't exist, but don't add it to the space immediately.
    useAsyncEffect(async () => {
      if (!space || chat) {
        return;
      }

      // Only query for existing chats on initial mount, not when plus button is clicked.
      if (!initialSetupDoneRef.current) {
        // Query for existing companion chats linked to this object.
        const existingChats = await space.db
          .query(Query.select(Filter.id(companionTo.id)).targetOf(Chat.CompanionTo).source())
          .run();

        initialSetupDoneRef.current = true;

        // Use existing chat if found on initial mount.
        if (existingChats.length > 0) {
          const existingChat = existingChats.at(-1) as Assistant.Chat;
          setChat(existingChat);
          await invokePromise(AssistantOperation.SetCurrentChat, { companionTo, chat: existingChat });
          return;
        }
      }

      // Create chat in-memory only - it will be added to space on first message.
      const { data: createResult } = await invokePromise(AssistantOperation.CreateChat, {
        db: space.db,
        addToSpace: false,
      });
      setChat(createResult?.object);
    }, [chat, space, companionTo, invokePromise]);

    // Add chat to space and create relation when user submits the first message.
    const handleEvent = useCallback(
      async (event: ChatEvent) => {
        if (!chat || !space) {
          return;
        }

        // If chat is not in space yet, persist it on first submit.
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
        space={space}
        subject={chat}
        companionTo={companionTo}
        onEvent={handleEvent}
        ref={forwardedRef}
      />
    );
  },
);

export default ChatCompanion;
