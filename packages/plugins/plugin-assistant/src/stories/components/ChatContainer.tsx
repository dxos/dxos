//
// Copyright 2025 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { Filter } from '@dxos/echo';
import { useQuery } from '@dxos/react-client/echo';

import { Chat, Toolbar } from '../../components';
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
  const processor = useChatProcessor({ space, chat, preset, services, blueprintRegistry });

  return !chat || !processor ? null : (
    <>
      <Toolbar chat={chat} onReset={() => onEvent?.('reset')} />
      <Chat.Root chat={chat} processor={processor}>
        <Chat.Thread />
        <div className='p-4'>
          <Chat.Prompt {...chatProps} outline preset={preset?.id} online={online} onOnlineChange={setOnline} />
        </div>
      </Chat.Root>
    </>
  );
};
