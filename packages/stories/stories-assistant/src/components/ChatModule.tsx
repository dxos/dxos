//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { useProcessManagerRuntime } from '@dxos/app-framework/ui';
import { Feed, Filter, Obj } from '@dxos/echo';
import { useBlueprintRegistry, useChatProcessor, useOnline, usePresets } from '@dxos/plugin-assistant/hooks';
import { Assistant } from '@dxos/plugin-assistant';
import { Agent } from '@dxos/assistant-toolkit';
import { Chat } from '@dxos/plugin-assistant/components';
import { useObject, useQuery } from '@dxos/react-client/echo';
import { IconButton, Panel, Popover, Toolbar } from '@dxos/react-ui';

import { ExecutionGraphModule } from './ExecutionGraphModule';
import { type ModuleProps } from './types';

export const ChatModule = ({ space }: ModuleProps) => {
  const [online, setOnline] = useOnline();
  const { preset, ...chatProps } = usePresets(online);

  const chats = useQuery(space.db, Filter.type(Assistant.Chat));
  const chat = chats.at(-1);

  // TODO(burdon): Better way to get the agent?
  const parent = chat ? Obj.getParent(chat) : undefined;
  const agent = parent && Obj.instanceOf(Agent.Agent, parent) ? parent : undefined;
  const [plan] = useObject(agent?.plan.target);
  const hasPlan = (plan?.tasks?.length ?? 0) > 0;

  const blueprintRegistry = useBlueprintRegistry();
  const runtime = useProcessManagerRuntime();
  const processor = useChatProcessor({ runtime, space, chat, preset, blueprintRegistry });

  const feedTarget = chat?.feed?.target;
  const feedDxn = feedTarget ? Feed.getQueueDxn(feedTarget) : undefined;
  const feed = feedDxn ? space.queues.get(feedDxn) : undefined;

  if (!chat || !processor) {
    return null;
  }

  return (
    <Chat.Root chat={chat} feed={feed} processor={processor}>
      <Panel.Root className='dx-document'>
        <Panel.Toolbar asChild>
          <Chat.Toolbar />
        </Panel.Toolbar>
        <Panel.Content asChild>
          <Chat.Content>
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
            {hasPlan && (
              <div className='flex flex-col items-center py-2 overflow-hidden'>
                <Chat.TaskList classNames='max-h-[120px] border border-separator rounded-sm text-description' />
              </div>
            )}
            <Chat.Prompt
              {...chatProps}
              classNames='border-none rounded-none'
              outline
              preset={preset?.id}
              online={online}
              onOnlineChange={setOnline}
            />
          </Chat.Content>
        </Panel.Content>
      </Panel.Root>
    </Chat.Root>
  );
};
