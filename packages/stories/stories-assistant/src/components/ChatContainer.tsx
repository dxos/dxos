//
// Copyright 2025 DXOS.org
//

import React, { useCallback } from 'react';

import { Filter } from '@dxos/echo';
import {
  Assistant,
  Chat,
  Toolbar,
  useBlueprintRegistry,
  useChatProcessor,
  useChatServices,
  useOnline,
  usePresets,
} from '@dxos/plugin-assistant';
import { useQuery } from '@dxos/react-client/echo';
import { IconButton, Popover } from '@dxos/react-ui';
import { StackItem } from '@dxos/react-ui-stack';

import { ExecutionGraphContainer } from './ExecutionGraphContainer';
import { type ComponentProps } from './types';

export const ChatContainer = ({ space, onEvent }: ComponentProps) => {
  const [online, setOnline] = useOnline();
  const { preset, ...chatProps } = usePresets(online);

  const chats = useQuery(space, Filter.type(Assistant.Chat));
  const chat = chats.at(-1);

  const blueprintRegistry = useBlueprintRegistry();
  const services = useChatServices({ space, chat });
  const processor = useChatProcessor({ chat, preset, services, blueprintRegistry });

  const handleUpdateName = useCallback(() => {
    if (chat) {
      void processor?.updateName(chat);
    }
  }, [processor, chat]);

  return !chat || !processor ? null : (
    <StackItem.Content toolbar>
      <div role='none' className='flex items-center gap-2 pie-2'>
        <Toolbar classNames='is-min grow' chat={chat} onReset={() => onEvent?.('reset')} />
        <Popover.Root>
          <Popover.Trigger asChild>
            <IconButton icon='ph--sort-ascending--regular' label='Logs' variant='ghost' />
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content>
              <ExecutionGraphContainer space={space} />
              <Popover.Arrow />
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
        <div className='truncate text-subdued'>{chat.name ?? 'no name'}</div>
        <IconButton icon='ph--arrow-clockwise--regular' iconOnly label='Update name' onClick={handleUpdateName} />
      </div>

      <div role='none' className='relative'>
        <Chat.Root chat={chat} processor={processor} classNames='absolute inset-0'>
          <Chat.Thread />
          {/* <ChatProgress chat={chat} /> */}
          <div className='flex justify-center p-4'>
            <Chat.Prompt
              {...chatProps}
              outline
              classNames='max-is-prose'
              preset={preset?.id}
              online={online}
              onOnlineChange={setOnline}
            />
          </div>
        </Chat.Root>
      </div>
    </StackItem.Content>
  );
};
