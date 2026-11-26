//
// Copyright 2025 DXOS.org
//

import * as Atom from 'effect/reactivity/Atom';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import type * as Surface from '@dxos/app-framework/Surface';
import * as ToolkitHooks from '@dxos/app-toolkit/Hooks';
import * as Agent from '@dxos/compute/Agent';
import { Filter, Obj } from '@dxos/echo';
import * as ChatParticipant from '@dxos/plugin-agent/ChatParticipant';
import * as Profile from '@dxos/plugin-agent/Profile';
import * as Assistant from '@dxos/plugin-assistant/Assistant';
import * as AssistantCapabilities from '@dxos/plugin-assistant/AssistantCapabilities';
import * as Chat from '@dxos/plugin-assistant/Chat';
import * as AssistantHooks from '@dxos/plugin-assistant/Hooks';
import { type Space, useObject, useQuery, useRegistry } from '@dxos/react-client/echo';
import { MenuBuilder } from '@dxos/react-ui-menu';
import * as Button from '@dxos/react-ui/Button';
import * as Icon from '@dxos/react-ui/Icon';
import * as Panel from '@dxos/react-ui/Panel';
import * as Popover from '@dxos/react-ui/Popover';
import * as Tooltip from '@dxos/react-ui/Tooltip';
import * as StoryModules from '@dxos/storybook-testing/StoryModules';
import { Person } from '@dxos/types';

export type ChatModuleData = {
  /** Name of the agent whose chat the panel shows, when the space holds several agents. */
  agent?: string;
  /** The commands the agent holds grants for, shown on hovering its name. */
  permissions?: readonly string[];
  /**
   * Name (preferred or full) of the person this panel speaks as: the panel shows the agent's chat with
   * them (see plugin-agent's `ChatParticipant`) and attributes every prompt to them.
   */
  participant?: string;
  /** Hue of the participant's messages, so each panel's speaker is distinguishable. */
  hue?: string;
  /** Submitted once, as the participant, when the panel's chat is first ready. */
  initialPrompt?: string;
  /** Prompts offered as chips above the composer, one at a time, in the order they are meant to be sent. */
  suggestions?: readonly string[];
  /** The drawer open above the prompt at the start, e.g. the chat's task list. */
  defaultDrawer?: Chat.RootProps['defaultDrawer'];
};

/** The name of the agent that parents the chat, if one does. */
const agentName = (chat: Agent.Session): string | undefined => {
  const parent = Obj.getParent(chat);
  return parent && Obj.instanceOf(Agent.Agent, parent) ? parent.name : undefined;
};

export const ChatModule = ({ data }: Surface.ComponentProps<ChatModuleData>) => {
  const space = ToolkitHooks.useActiveSpace();
  if (!space) {
    return null;
  }
  return <ChatModuleContainer space={space} {...data} />;
};

const ChatModuleContainer = ({
  space,
  agent,
  permissions,
  participant,
  hue,
  initialPrompt,
  suggestions = [],
  defaultDrawer,
}: ChatModuleData & { space: Space }) => {
  const chats = useQuery(space.db, Filter.type(Agent.Session));
  const people = useQuery(space.db, Filter.type(Person.Person));
  const person = participant
    ? people.find(({ preferredName, fullName }) => preferredName === participant || fullName === participant)
    : undefined;
  const participantChat = person ? chats.find((chat) => ChatParticipant.get(chat) === person.id) : undefined;
  const sender = useMemo(() => (person ? { name: Profile.displayName(person) } : undefined), [person]);

  // The newest chat until the reader picks another; a template switch drops the id and lands on the
  // new space's own chat.
  const [selected, setSelected] = useState<string>();
  const agentChat = agent ? chats.find((chat) => agentName(chat) === agent) : undefined;
  const chat =
    chats.find(({ id }) => id === selected) ?? (participant ? participantChat : agent ? agentChat : chats.at(-1));

  // The picker edits the chat's own model, so the hook needs the chat it is rendered for.
  const settings = Hooks.useAtomCapability(AssistantCapabilities.Settings);
  const { preset, ...chatProps } = AssistantHooks.usePresets(settings, chat);

  // Every chat in the space, not the companion chats of one object: the story is a tour of the
  // space, and its chats are the thing worth moving between. A panel for one agent offers only that agent's sessions.
  const onSelect = useCallback((chat: Agent.Session) => setSelected(chat.id), []);
  const switcher = useMemo(
    () => ({ chats: agent ? chats.filter((chat) => agentName(chat) === agent) : [...chats], onSelect }),
    [chats, agent, onSelect],
  );
  const headerAgent = chat ? agentName(chat) : undefined;

  const registry = useRegistry();
  const runtime = Hooks.useProcessManagerRuntime();
  const chatModel = AssistantHooks.useChatModel({ runtime, db: space.db, chat, preset, registry, settings, sender });

  // One chip at a time: a later prompt only makes sense once the one before it is under way.
  const [sent, setSent] = useState(0);
  const handleSelect = useCallback(() => setSent((count) => count + 1), []);

  const [viewValue] = useObject(chat, 'viewType');
  const view = Assistant.ChatViews.find((value) => value === viewValue);

  const title = sender ? `${sender.name} · ${chat?.name ?? ''}` : (chat?.name ?? '');
  const customActions = useMemo(
    () =>
      Atom.make(() =>
        MenuBuilder.make()
          .text('title', { label: title, classNames: 'text-fg-subtle' })
          .custom('logs', { label: 'Logs' }, () => (
            <Popover.Root>
              <Popover.Trigger asChild>
                <Button.Root icon='ph--sort-ascending--regular' label='Logs' variant='ghost' />
              </Popover.Trigger>
              <Popover.Content>
                <StoryModules.ExecutionGraphModule />
              </Popover.Content>
            </Popover.Root>
          ))
          .build(),
      ),
    [title],
  );

  // Once per chat for the panel's life: each story load seeds a fresh space, so a remount is the only repeat.
  const prompted = useRef(new Set<string>());
  useEffect(() => {
    if (!initialPrompt || !chat || !chatModel || prompted.current.has(chat.id)) {
      return;
    }

    prompted.current.add(chat.id);
    void chatModel.request({ message: initialPrompt });
  }, [initialPrompt, chat, chatModel]);

  if (!chat || !chatModel) {
    return null;
  }

  return (
    <Chat.Root chat={chat} chatModel={chatModel} defaultDrawer={defaultDrawer}>
      <Panel.Root
        data-testid={participant ? `chat-panel-${participant}` : agent ? `chat-panel-${agent}` : 'chat-module'}
      >
        <Panel.Header classNames='flex flex-col'>
          {headerAgent && (
            <Tooltip.Trigger
              asChild
              content={
                permissions === undefined
                  ? undefined
                  : permissions.length > 0
                    ? `Permissions: ${permissions.join(', ')}`
                    : 'No permissions'
              }
            >
              <div
                className='flex items-center gap-2 px-2 py-1 border-b border-separator'
                data-testid='chat-module.agent-header'
              >
                <Icon.Icon icon='ph--robot--regular' classNames='w-4 h-4 text-fg-subtle' />
                <span className='font-medium truncate' data-testid='chat-module.agent'>
                  {headerAgent}
                </span>
              </div>
            </Tooltip.Trigger>
          )}
          <Chat.Toolbar attendableId={chat.id} alwaysActive switcher={switcher} customActions={customActions} />
        </Panel.Header>
        <Panel.Body asChild>
          <Chat.Content>
            <Chat.Thread viewType={view} userHue={hue} />
            <div className='flex flex-col gap-1 p-1'>
              <Chat.Activity />
              <Chat.Suggestions suggestions={suggestions.slice(sent, sent + 1)} onSelect={handleSelect} />
              <Chat.Prompt {...chatProps} outline preset={preset?.id} />
            </div>
          </Chat.Content>
        </Panel.Body>
      </Panel.Root>
    </Chat.Root>
  );
};
