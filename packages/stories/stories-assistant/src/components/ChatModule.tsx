//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { useProcessManagerRuntime } from '@dxos/app-framework/ui';
import { Feed, Filter } from '@dxos/echo';
import { Assistant, Chat, useBlueprintRegistry, useChatProcessor, useOnline, usePresets } from '@dxos/plugin-assistant';
import { useQuery } from '@dxos/react-client/echo';
import { IconButton, Panel, Popover, Toolbar } from '@dxos/react-ui';

import { ExecutionGraphModule } from './ExecutionGraphModule';
import { type ComponentProps } from './types';

export const ChatModule = ({ space }: ComponentProps) => {
  const [online, setOnline] = useOnline();
  const { preset, ...chatProps } = usePresets(online);

  const chats = useQuery(space.db, Filter.type(Assistant.Chat));
  const chat = chats.at(-1);

  const blueprintRegistry = useBlueprintRegistry();
  const runtime = useProcessManagerRuntime();
  const processor = useChatProcessor({ runtime, space, chat, preset, blueprintRegistry });

  const feedTarget = chat?.feed?.target;
  const queue = feedTarget ? space.queues.get(Feed.getQueueDxn(feedTarget)!) : undefined;

  if (!chat || !processor) {
    return null;
  }

  return (
    <Chat.Root chat={chat} queue={queue} processor={processor}>
      <Panel.Root className='dx-document'>
        {/* TODO(burdon): Chat.Toolbar => Menu.Root which doesn't handle slot. Need to audit Root components. */}
        <Panel.Toolbar>
          <Chat.Toolbar />
        </Panel.Toolbar>
        <Panel.Content asChild>
          {/* TODO(burdon): Remove relative. */}
          <Chat.Viewport classNames='relative'>
            <Toolbar.Root>
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
            </Toolbar.Root>
            <Chat.Thread />
            <Chat.Prompt
              {...chatProps}
              classNames='border-none rounded-none'
              outline
              preset={preset?.id}
              online={online}
              onOnlineChange={setOnline}
            />
          </Chat.Viewport>
        </Panel.Content>
      </Panel.Root>
    </Chat.Root>
  );
};
