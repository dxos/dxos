//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Agent } from '@dxos/assistant-toolkit';
import { Feed, Filter, Obj } from '@dxos/echo';
import { Chat } from '@dxos/plugin-assistant/components';
import { useBlueprintRegistry, useChatProcessor, useOnline, usePresets } from '@dxos/plugin-assistant/hooks';
import { Assistant } from '@dxos/plugin-assistant/types';
import { useComputeRuntime } from '@dxos/plugin-automation/hooks';
import { useQuery } from '@dxos/react-client/echo';
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
  // const plan = useObject(agent?.plan);

  const blueprintRegistry = useBlueprintRegistry();
  const runtime = useComputeRuntime(space.id);
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
          <Chat.Content
            classNames={[
              'relative grid',
              agent?.plan.target ? 'grid-rows-[auto_1fr_3fr_auto]' : 'grid-rows-[auto_1fr_auto]',
            ]}
          >
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
            {agent?.plan.target && (
              <Surface.Surface type={AppSurface.Article} data={{ subject: agent.plan.target, attendableId: 'story' }} />
            )}
            <Chat.Thread />
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
