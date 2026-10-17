//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import * as AppHooks from '@dxos/app-framework/Hooks';
import type * as Surface from '@dxos/app-framework/Surface';
import * as Hooks from '@dxos/app-toolkit/Hooks';
import * as AssistantChat from '@dxos/assistant/Chat';
import { Filter, Obj } from '@dxos/echo';
import * as AgentChannels from '@dxos/plugin-agent/AgentChannels';
import * as Assistant from '@dxos/plugin-assistant/Assistant';
import * as Chat from '@dxos/plugin-assistant/Chat';
import * as AssistantHooks from '@dxos/plugin-assistant/Hooks';
import { type Space, useObject, useQuery, useRegistry } from '@dxos/react-client/echo';
import * as Layout from '@dxos/react-ui/Layout';
import * as Panel from '@dxos/react-ui/Panel';
import * as Select from '@dxos/react-ui/Select';
import * as Status from '@dxos/react-ui/Status';
import * as Toolbar from '@dxos/react-ui/Toolbar';

/**
 * The agent's channel conversations (Discord channels, threads and DMs bridged into the space), one at a time and read
 * only: the thread without a prompt, since people talk to the agent in Discord. The newest is shown until the story's
 * toolbar picks another.
 */
export const ConversationModule = (_props: Surface.ComponentProps<Record<string, unknown>>) => {
  const space = Hooks.useActiveSpace();
  return space ? <ConversationPanel space={space} /> : null;
};

const ConversationPanel = ({ space }: { space: Space }) => {
  const chats = useQuery(space.db, Filter.type(AssistantChat.Chat));
  // In the order they started, as the Activity panel lists them (ULID ids sort by creation); the last is the newest.
  const conversations = useMemo(
    () =>
      chats
        .filter((chat) => AgentChannels.conversationOf(chat) !== undefined)
        .sort((left, right) => left.id.localeCompare(right.id)),
    [chats],
  );
  const [selected, setSelected] = useState<string>();
  const chat = conversations.find(({ id }) => id === selected) ?? conversations.at(-1);

  // Each thread owns its chat model; the one on screen stays until the newly picked one's model is ready, so a switch
  // does not flash an empty panel.
  const [shown, setShown] = useState<string>();
  const handleReady = useCallback((id: string) => setShown(id), []);
  const visible = conversations.find(({ id }) => id === shown);

  const toolbar = (
    <Toolbar.Root>
      {/* The text takes the free space, which keeps the picker at the end. */}
      <Toolbar.Text>Conversation</Toolbar.Text>
      {chat && conversations.length > 0 && (
        <Select.Root
          value={[chat.id]}
          onValueChange={({ value: [value] }) => value && setSelected(value)}
          items={conversations.map((conversation) => ({ value: conversation.id, label: titleOf(conversation) }))}
        >
          <Select.Trigger classNames='max-w-[50%] min-w-0 text-sm' />
          <Select.Content>
            {conversations.map((conversation) => (
              <Select.Item
                key={conversation.id}
                classNames='text-sm'
                item={{ value: conversation.id, label: titleOf(conversation) }}
              />
            ))}
          </Select.Content>
        </Select.Root>
      )}
    </Toolbar.Root>
  );

  return (
    <Panel.Root data-testid='agent-conversation'>
      <Panel.Header>{toolbar}</Panel.Header>
      <Panel.Body asChild>
        <Layout.Flex column classNames='min-h-0'>
          {conversations.length === 0 && <Status.Empty>No channel conversations yet.</Status.Empty>}
          {[visible, chat]
            .filter(
              (conversation, index, all): conversation is AssistantChat.Chat =>
                conversation !== undefined && all.indexOf(conversation) === index,
            )
            .map((conversation) => (
              <ConversationThread
                key={conversation.id}
                space={space}
                chat={conversation}
                hidden={conversation.id !== (visible ?? chat)?.id}
                onReady={conversation.id === chat?.id ? handleReady : undefined}
              />
            ))}
        </Layout.Flex>
      </Panel.Body>
    </Panel.Root>
  );
};

type ConversationThreadProps = {
  space: Space;
  chat: AssistantChat.Chat;
  hidden: boolean;
  /** Called with the chat's id once its model is ready. */
  onReady?: (id: string) => void;
};

/** One conversation's thread, read only: no prompt, since people talk to the agent in Discord. */
const ConversationThread = ({ space, chat, hidden, onReady }: ConversationThreadProps) => {
  const { preset } = AssistantHooks.usePresets({}, chat);
  const registry = useRegistry();
  const runtime = AppHooks.useProcessManagerRuntime();
  const chatModel = AssistantHooks.useChatModel({ runtime, db: space.db, chat, preset, registry });
  const [viewValue] = useObject(chat, 'viewType');
  const view = Assistant.ChatViews.find((value) => value === viewValue);

  useEffect(() => {
    if (chatModel) {
      onReady?.(chat.id);
    }
  }, [chatModel, chat.id, onReady]);

  if (!chatModel || hidden) {
    return null;
  }

  return (
    <Chat.Root chat={chat} chatModel={chatModel}>
      <Chat.Content>
        <Chat.Thread viewType={view} />
      </Chat.Content>
    </Chat.Root>
  );
};

const titleOf = (chat: AssistantChat.Chat): string => Obj.getLabel(chat) ?? chat.name ?? chat.id;
