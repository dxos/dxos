//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

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
import { Button, Flex, Panel, Popover, Toolbar } from '@dxos/react-ui';
import { ExecutionGraphModule } from '@dxos/storybook-testing/modules';
import { Person } from '@dxos/types';

export type ChatModuleData = {
  /**
   * Name (preferred or full) of the person this panel speaks as: the panel shows the agent's chat with
   * them (see plugin-agent's `ChatParticipant`) and attributes every prompt to them.
   */
  participant?: string;
  /** Hue of the participant's messages, so each panel's speaker is distinguishable. */
  hue?: string;
  /** Submitted once, as the participant, when the panel's chat is first ready. */
  initialPrompt?: string;
};

export const ChatModule = ({ data }: Surface.ComponentProps<ChatModuleData>) => {
  const space = useActiveSpace();
  if (!space) {
    return null;
  }
  return (
    <ChatModuleContainer
      space={space}
      participant={data?.participant}
      hue={data?.hue}
      initialPrompt={data?.initialPrompt}
    />
  );
};

const ChatModuleContainer = ({
  space,
  participant,
  hue,
  initialPrompt,
}: {
  space: Space;
  participant?: string;
  hue?: string;
  initialPrompt?: string;
}) => {
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

  // Once per chat for the panel's life: each story load seeds a fresh space, so a remount is the only repeat.
  const prompted = useRef(new Set<string>());
  useEffect(() => {
    if (!initialPrompt || !chat || !processor || prompted.current.has(chat.id)) {
      return;
    }

    prompted.current.add(chat.id);
    void processor.request({ message: initialPrompt });
  }, [initialPrompt, chat, processor]);

  if (!chat || !processor) {
    return null;
  }

  return (
    <Chat.Root chat={chat} processor={processor}>
      <Panel.Root data-testid={participant ? `chat-panel-${participant}` : undefined}>
        <Panel.Header>
          <Chat.Toolbar attendableId={chat.id} alwaysActive switcher={switcher}>
            <Toolbar.Text classNames='text-fg-subtle'>
              {sender ? `${sender.name} · ${chat?.name ?? ''}` : chat?.name}
            </Toolbar.Text>
            <Popover.Root>
              <Popover.Trigger asChild>
                <Button icon='ph--sort-ascending--regular' label='Logs' variant='ghost' />
              </Popover.Trigger>
              <Popover.Content>
                <ExecutionGraphModule />
              </Popover.Content>
            </Popover.Root>
          </Chat.Toolbar>
        </Panel.Header>
        <Panel.Body asChild>
          <Chat.Content>
            <Chat.Thread viewType={view} userHue={hue} />
            <Flex column classNames='relative gap-1 p-1'>
              <Chat.Queue />
              <Chat.Activity />
            </Flex>
            <Chat.Prompt {...chatProps} outline preset={preset?.id} />
          </Chat.Content>
        </Panel.Body>
      </Panel.Root>
    </Chat.Root>
  );
};
