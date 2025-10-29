//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, useCapability } from '@dxos/app-framework';
import { getSpace } from '@dxos/client/echo';
import { type Obj } from '@dxos/echo';
import { StackItem } from '@dxos/react-ui-stack';

import { useBlueprintRegistry, useChatProcessor, useChatServices, useOnline, usePresets } from '../hooks';
import { meta } from '../meta';
import { type Assistant } from '../types';

import { Chat } from './Chat';

export type ChatContainerProps = {
  role?: string;
  chat?: Assistant.Chat;
  companionTo?: Obj.Any;
};

export const ChatContainer = ({ chat, companionTo }: ChatContainerProps) => {
  const space = getSpace(chat);
  const settings = useCapability(Capabilities.SettingsStore).getStore<Assistant.Settings>(meta.id)?.value;
  const services = useChatServices({ space, chat });
  const [online, setOnline] = useOnline();
  const { preset, ...chatProps } = usePresets(online);
  const blueprintRegistry = useBlueprintRegistry();
  const processor = useChatProcessor({ chat, preset, services, blueprintRegistry, settings });

  if (!processor) {
    return null;
  }

  return (
    <StackItem.Content toolbar>
      <Chat.Root chat={chat} processor={processor}>
        <Chat.Toolbar companionTo={companionTo} />
        <Chat.Content classNames='container-max-width'>
          <Chat.Thread />
          <div role='none' className='p-4'>
            <Chat.Prompt {...chatProps} outline preset={preset?.id} online={online} onOnlineChange={setOnline} />
          </div>
        </Chat.Content>
      </Chat.Root>
    </StackItem.Content>
  );
};

export default ChatContainer;
