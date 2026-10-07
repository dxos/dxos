//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import type * as Surface from '@dxos/app-framework/Surface';
import * as ToolkitHooks from '@dxos/app-toolkit/Hooks';
import * as AssistantChat from '@dxos/assistant/Chat';
import { Filter } from '@dxos/echo';
import * as ChatParticipant from '@dxos/plugin-agent/ChatParticipant';
import * as Profile from '@dxos/plugin-agent/Profile';
import * as Assistant from '@dxos/plugin-assistant/Assistant';
import * as Chat from '@dxos/plugin-assistant/Chat';
import * as AssistantHooks from '@dxos/plugin-assistant/Hooks';
import { type Space, useObject, useQuery, useRegistry } from '@dxos/react-client/echo';
import * as Button from '@dxos/react-ui/Button';
import * as Panel from '@dxos/react-ui/Panel';
import * as Popover from '@dxos/react-ui/Popover';
import * as Toolbar from '@dxos/react-ui/Toolbar';
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
  const space = ToolkitHooks.useActiveSpace();
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
  const chats = useQuery(space.db, Filter.type(AssistantChat.Chat));
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
  const { preset, ...chatProps } = AssistantHooks.usePresets({}, chat);

  // Every chat in the space, not the companion chats of one object: the story is a tour of the
  // space, and its chats are the thing worth moving between.
  const onSelect = useCallback((chat: AssistantChat.Chat) => setSelected(chat.id), []);
  const switcher = useMemo(() => ({ chats: [...chats], onSelect }), [chats, onSelect]);

  const registry = useRegistry();
  const runtime = Hooks.useProcessManagerRuntime();
  const processor = AssistantHooks.useChatProcessor({ runtime, db: space.db, chat, preset, registry, sender });

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
                <Button.Root icon='ph--sort-ascending--regular' label='Logs' variant='ghost' />
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
            <div className='flex flex-col gap-1 p-1'>
              <Chat.Activity />
              <Chat.Prompt {...chatProps} outline preset={preset?.id} />
            </div>
          </Chat.Content>
        </Panel.Body>
      </Panel.Root>
    </Chat.Root>
  );
};
