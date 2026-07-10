//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { useProcessManagerRuntime } from '@dxos/app-framework/ui';
import { Filter } from '@dxos/echo';
import { Assistant } from '@dxos/plugin-assistant';
import { Chat } from '@dxos/plugin-assistant/components';
import { useChatProcessor, usePresets } from '@dxos/plugin-assistant/hooks';
import { type Space, useObject, useQuery, useRegistry } from '@dxos/react-client/echo';
import { IconButton, Panel, Popover, Toolbar } from '@dxos/react-ui';

import { ExecutionGraphModule } from './ExecutionGraphModule';

export const ChatModule = ({ space }: { space: Space }) => {
  const { preset, ...chatProps } = usePresets({});

  const chats = useQuery(space.db, Filter.type(Assistant.Chat));
  const chat = chats.at(-1);

  const registry = useRegistry();
  const runtime = useProcessManagerRuntime();
  const processor = useChatProcessor({ runtime, space, chat, preset, registry });

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
                  <ExecutionGraphModule space={space} />
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
