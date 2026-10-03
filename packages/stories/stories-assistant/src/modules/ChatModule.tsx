//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import { Surface, useProcessManagerRuntime } from '@dxos/app-framework/ui';
import { useActiveSpace } from '@dxos/app-toolkit/ui';
import * as ChatSchema from '@dxos/assistant/Chat';
import { Filter } from '@dxos/echo';
import * as ChatParticipant from '@dxos/plugin-agent/ChatParticipant';
import * as Profile from '@dxos/plugin-agent/Profile';
import * as Assistant from '@dxos/plugin-assistant/Assistant';
import { Chat } from '@dxos/plugin-assistant/components';
import { useChatProcessor, usePresets } from '@dxos/plugin-assistant/hooks';
import { type Space, useObject, useQuery, useRegistry } from '@dxos/react-client/echo';
import { IconButton, Panel, Popover, Toolbar } from '@dxos/react-ui';
import { ExecutionGraphModule } from '@dxos/storybook-testing/modules';
import { Person } from '@dxos/types';

export type ChatModuleData = {
  /**
   * Name (preferred or full) of the person this panel speaks as: the panel shows the agent's chat with
   * them (see plugin-agent's `ChatParticipant`) and attributes every prompt to them.
   */
  participant?: string;
};

export const ChatModule = ({ data }: Surface.ComponentProps<ChatModuleData>) => {
  const space = useActiveSpace();
  if (!space) {
    return null;
  }
  return <ChatModuleContainer space={space} participant={data?.participant} />;
};

const ChatModuleContainer = ({ space, participant }: { space: Space; participant?: string }) => {
  const chats = useQuery(space.db, Filter.type(ChatSchema.Chat));
  const people = useQuery(space.db, Filter.type(Person.Person));
  const person = participant
    ? people.find(({ preferredName, fullName }) => preferredName === participant || fullName === participant)
    : undefined;
  const participantChat = person ? chats.find((chat) => ChatParticipant.get(chat) === person.id) : undefined;
  const sender = useMemo(() => (person ? { name: Profile.displayName(person) } : undefined), [person]);

  // The newest chat until the reader picks another; a template switch drops the id and lands on the
  // new space's own chat.
  const [selected, setSelected] = useState<string>();
  const chat = chats.find(({ id }) => id === selected) ?? (participant ? participantChat : chats.at(-1));

  // The picker edits the chat's own model, so the hook needs the chat it is rendered for.
  const { preset, ...chatProps } = usePresets({}, chat);

  // Every chat in the space, not the companion chats of one object: the story is a tour of the
  // space, and its chats are the thing worth moving between.
  const onSelect = useCallback((chat: ChatSchema.Chat) => setSelected(chat.id), []);
  const switcher = useMemo(() => ({ chats: [...chats], onSelect }), [chats, onSelect]);

  const registry = useRegistry();
  const runtime = useProcessManagerRuntime();
  const processor = useChatProcessor({ runtime, db: space.db, chat, preset, registry, sender });

  // Honor the view mode selected in ChatOptions (persisted on `chat.viewType`). Subscribe via
  // `useObject` so changing the mode re-renders, and narrow the stored string to a valid ChatView.
  const [viewValue] = useObject(chat, 'viewType');
  const view = Assistant.ChatViews.find((value) => value === viewValue);

  if (!chat || !processor) {
    return null;
  }

  return (
    <Chat.Root chat={chat} processor={processor}>
      <Panel.Root data-testid={participant ? `chat-panel-${participant}` : undefined}>
        <Panel.Toolbar asChild>
          <Chat.Toolbar attendableId={chat.id} alwaysActive switcher={switcher}>
            <Toolbar.Text classNames='text-subdued'>
              {sender ? `${sender.name} · ${chat?.name ?? ''}` : chat?.name}
            </Toolbar.Text>
            <Popover.Root>
              <Popover.Trigger asChild>
                <IconButton icon='ph--sort-ascending--regular' label='Logs' variant='ghost' />
              </Popover.Trigger>
              <Popover.Portal>
                <Popover.Content>
                  <ExecutionGraphModule />
                  <Popover.Arrow />
                </Popover.Content>
              </Popover.Portal>
            </Popover.Root>
          </Chat.Toolbar>
        </Panel.Toolbar>
        <Panel.Content asChild>
          <Chat.Content>
            <Chat.Thread viewType={view} />
            <div className='flex flex-col gap-1 p-1'>
              <Chat.Queue />
              <Chat.Activity />
              <Chat.Prompt {...chatProps} outline preset={preset?.id} />
            </div>
          </Chat.Content>
        </Panel.Content>
      </Panel.Root>
    </Chat.Root>
  );
};
