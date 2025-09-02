//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useEffect, useState } from 'react';

import { Filter } from '@dxos/echo';
import { useQuery } from '@dxos/react-client/echo';
import { IconButton } from '@dxos/react-ui';

import { Chat, ChatProgress, Toolbar } from '../../components';
import { useBlueprintRegistry, useChatProcessor, useChatServices } from '../../hooks';
import { useOnline, usePresets } from '../../hooks';
import { Assistant } from '../../types';

import { type ComponentProps } from './types';

export const ChatContainer = ({ space, onEvent }: ComponentProps) => {
  const [online, setOnline] = useOnline();
  const { preset, ...chatProps } = usePresets(online);

  const chats = useQuery(space, Filter.type(Assistant.Chat));
  const [chat, setChat] = useState<Assistant.Chat>();
  useEffect(() => {
    setChat((currentChat) => currentChat ?? chats[0]);
  }, [chat, chats]);

  const blueprintRegistry = useBlueprintRegistry();
  const services = useChatServices({ space, chat });
  const processor = useChatProcessor({ chat, preset, services, blueprintRegistry });

  const handleUpdateName = useCallback(() => {
    if (chat) {
      void processor?.updateName(chat);
    }
  }, [processor, chat]);

  return !chat || !processor ? null : (
    <>
      <div className='grid grid-cols-[1fr_auto] items-center'>
        <Toolbar chat={chat} onReset={() => onEvent?.('reset')} />
        <div className='flex shrink-0 gap-2 max-w-[20rem] pie-2 items-center'>
          <div className='truncate text-subdued'>{chat.name ?? 'no name'}</div>
          <IconButton icon='ph--arrow-clockwise--regular' iconOnly label='Update name' onClick={handleUpdateName} />
        </div>
      </div>

      <Chat.Root chat={chat} processor={processor}>
        <Chat.Thread />
        <ChatProgress chat={chat} />
        <div className='p-4'>
          <Chat.Prompt {...chatProps} outline preset={preset?.id} online={online} onOnlineChange={setOnline} />
        </div>
      </Chat.Root>
    </>
  );
};
