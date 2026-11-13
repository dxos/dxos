//
// Copyright 2026 DXOS.org
//

import * as Atom from 'effect/reactivity/Atom';
import React, { useMemo } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as ToolkitHooks from '@dxos/app-toolkit/Hooks';
import * as AssistantChat from '@dxos/assistant/Chat';
import { Filter } from '@dxos/echo';
import * as AssistantCapabilities from '@dxos/plugin-assistant/AssistantCapabilities';
import * as Chat from '@dxos/plugin-assistant/Chat';
import * as AssistantHooks from '@dxos/plugin-assistant/Hooks';
import { type Space, useQuery, useRegistry } from '@dxos/react-client/echo';
import { MenuBuilder } from '@dxos/react-ui-menu';
import * as Layout from '@dxos/react-ui/Layout';
import * as Panel from '@dxos/react-ui/Panel';

import { useFactsStory } from './context.ts';

/** Starter prompts over the Discord crawl the fact server exposes. */
const SUGGESTIONS = ['Who works on what?', 'What questions were asked about OPFS?', 'Summarize dmaretskyi'];

/**
 * LEFT: a chat whose agent answers from the fact store through the Brain skill; the facts its tools read scope the
 * facts and entities views (see the story's `onOperationFacts`), and the toolbar's reset shows every fact again.
 */
export const ChatModule = () => {
  const space = ToolkitHooks.useActiveSpace();
  if (!space) {
    return null;
  }
  return <ChatModuleContainer space={space} />;
};

const ChatModuleContainer = ({ space }: { space: Space }) => {
  const chats = useQuery(space.db, Filter.type(AssistantChat.Chat));
  const chat = chats.at(-1);
  const { setScope, setPredicate, setSelected } = useFactsStory();

  const settings = Hooks.useAtomCapability(AssistantCapabilities.Settings);
  const { preset, ...chatProps } = AssistantHooks.usePresets(settings, chat);
  const registry = useRegistry();
  const runtime = Hooks.useProcessManagerRuntime();
  const chatModel = AssistantHooks.useChatModel({ runtime, db: space.db, chat, preset, registry, settings });

  const customActions = useMemo(
    () =>
      Atom.make(() =>
        MenuBuilder.make()
          .action(
            'show-all',
            { label: 'Show all facts', icon: 'ph--arrow-counter-clockwise--regular', testId: 'fact-explorer.show-all' },
            () => {
              setScope(undefined);
              setPredicate(undefined);
              setSelected(undefined);
            },
          )
          .build(),
      ),
    [setScope, setPredicate, setSelected],
  );

  if (!chat || !chatModel) {
    return null;
  }

  return (
    <Chat.Root chat={chat} chatModel={chatModel}>
      <Panel.Root>
        <Panel.Header>
          <Chat.Toolbar attendableId={chat.id} alwaysActive customActions={customActions} />
        </Panel.Header>
        <Panel.Body asChild>
          <Chat.Content>
            <Chat.Thread viewType={settings.chatView} />
            <Layout.Flex column gap='xs' classNames='p-1'>
              <Chat.Activity />
              <Chat.Suggestions suggestions={SUGGESTIONS} />
              <Chat.Prompt {...chatProps} outline preset={preset?.id} />
            </Layout.Flex>
          </Chat.Content>
        </Panel.Body>
      </Panel.Root>
    </Chat.Root>
  );
};
