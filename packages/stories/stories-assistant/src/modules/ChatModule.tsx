//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { useProcessManagerRuntime } from '@dxos/app-framework/ui';
import { useActiveSpace } from '@dxos/app-toolkit/ui';
import { Chat as ChatSchema } from '@dxos/assistant-toolkit';
import { Filter } from '@dxos/echo';
import * as Assistant from '@dxos/plugin-assistant/Assistant';
import { Chat } from '@dxos/plugin-assistant/components';
import { useChatProcessor, usePresets } from '@dxos/plugin-assistant/hooks';
import { type Space, useObject, useQuery, useRegistry } from '@dxos/react-client/echo';
import { IconButton, Panel, Popover, Toolbar } from '@dxos/react-ui';
import { ExecutionGraphModule } from '@dxos/storybook-testing/modules';

export const ChatModule = () => {
  const space = useActiveSpace();
  if (!space) {
    return null;
  }
  return <ChatModuleContainer space={space} />;
};

/** `plugin-assistant` has no `./processor` entry, so the type is taken from the hook's return. */
type ChatProcessor = NonNullable<ReturnType<typeof useChatProcessor>>;

/**
 * The processor the module last rendered, so a story's play function can reach it. The thread reads
 * the processor's in-memory messages rather than the feed, so an externally-produced turn has to be
 * handed to it — see `AiChatProcessor.present`.
 */
let currentProcessor: ChatProcessor | undefined;

export const getChatProcessor = (): ChatProcessor | undefined => currentProcessor;

const ChatModuleContainer = ({ space }: { space: Space }) => {
  const { preset, ...chatProps } = usePresets({});

  const chats = useQuery(space.db, Filter.type(ChatSchema.Chat));
  const chat = chats.at(-1);

  const registry = useRegistry();
  const runtime = useProcessManagerRuntime();
  const processor = useChatProcessor({ runtime, space, chat, preset, registry });
  currentProcessor = processor;

  // Honor the view mode selected in ChatOptions (persisted on `chat.viewType`). Subscribe via
  // `useObject` so changing the mode re-renders, and narrow the stored string to a valid ChatView.
  const [viewValue] = useObject(chat, 'viewType');
  const view = Assistant.ChatViews.find((value) => value === viewValue);

  if (!chat || !processor) {
    return null;
  }

  return (
    <Chat.Root chat={chat} processor={processor}>
      <Panel.Root>
        <Panel.Toolbar asChild>
          <Chat.Toolbar attendableId={chat.id} alwaysActive>
            <Toolbar.Text classNames='text-subdued'>{chat?.name}</Toolbar.Text>
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
            <Chat.TaskList classNames='max-h-[120px] border-t border-separator rounded-sm text-description' />
            <Chat.Prompt {...chatProps} classNames='border-none rounded-none' outline preset={preset?.id} />
          </Chat.Content>
        </Panel.Content>
      </Panel.Root>
    </Chat.Root>
  );
};
