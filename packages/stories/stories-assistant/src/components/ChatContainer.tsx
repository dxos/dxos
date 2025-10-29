//
// Copyright 2025 DXOS.org
//

import React, { useCallback } from 'react';

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
      <Chat.Root chat={chat} processor={processor} classNames='absolute inset-0'>
        <Chat.Toolbar onReset={() => onEvent?.('reset')} />

        {/* TODO(burdon): Optionally extend menu. */}
        {false && (
          <div role='none' className='flex items-center gap-2 pie-2'>
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
            <div className='truncate text-subdued'>{chat?.name ?? 'no name'}</div>
            <IconButton icon='ph--arrow-clockwise--regular' iconOnly label='Update name' onClick={handleUpdateName} />
          </div>
        )}

        {/* TODO(burdon): Why add relative here? */}
        <Chat.Content classNames='relative container-max-width'>
          <Chat.Thread />
          <Chat.Prompt
            {...chatProps}
            classNames='m-4'
            outline
            preset={preset?.id}
            online={online}
            onOnlineChange={setOnline}
          />
        </Chat.Content>
      </Chat.Root>
    </StackItem.Content>
  );
};
