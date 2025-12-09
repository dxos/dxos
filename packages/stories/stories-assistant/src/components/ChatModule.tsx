//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Filter } from '@dxos/echo';
import {
  Assistant,
  Chat,
  useBlueprintRegistry,
  useChatProcessor,
  useChatServices,
  useOnline,
  usePresets,
} from '@dxos/plugin-assistant';
import { useQuery } from '@dxos/react-client/echo';
import { IconButton, Popover, Toolbar } from '@dxos/react-ui';
import { StackItem } from '@dxos/react-ui-stack';

import { ExecutionGraphModule } from './ExecutionGraphModule';
import { type ComponentProps } from './types';

export const ChatModule = ({ space }: ComponentProps) => {
  const [online, setOnline] = useOnline();
  const { preset, ...chatProps } = usePresets(online);

  const chats = useQuery(space.db, Filter.type(Assistant.Chat));
  const chat = chats.at(-1);

  const blueprintRegistry = useBlueprintRegistry();
  const services = useChatServices({ space, chat });
  const processor = useChatProcessor({ space, chat, preset, services, blueprintRegistry });

  if (!chat || !processor) {
    return null;
  }

  return (
    <StackItem.Content toolbar>
      <Chat.Root chat={chat} processor={processor}>
        <Chat.Toolbar />
        <Chat.Viewport classNames='relative container-max-width'>
          <Toolbar.Root classNames='border-be border-subduedSeparator'>
            <div className='pli-1 grow truncate text-subdued'>{chat?.name}</div>
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
          <div role='none' className='p-4'>
            <Chat.Prompt {...chatProps} outline preset={preset?.id} online={online} onOnlineChange={setOnline} />
          </div>
        </Chat.Viewport>
      </Chat.Root>
    </StackItem.Content>
  );
};
