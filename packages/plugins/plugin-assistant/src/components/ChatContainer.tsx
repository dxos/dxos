//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, useCapability } from '@dxos/app-framework';
import { getSpace } from '@dxos/client/echo';
import { StackItem } from '@dxos/react-ui-stack';

import { useChatProcessor, useChatServices, useOnline, usePresets } from '../hooks';
import { meta } from '../meta';
import { type Assistant } from '../types';

import { Chat } from './Chat';

export type ChatContainerProps = {
  chat: Assistant.Chat;
  role?: string;
};

export const ChatContainer = ({ chat }: ChatContainerProps) => {
  const space = getSpace(chat);
  const settings = useCapability(Capabilities.SettingsStore).getStore<Assistant.Settings>(meta.id)?.value;
  const services = useChatServices({ space });

  const [online, setOnline] = useOnline();
  const { preset, ...chatProps } = usePresets(online);
  const processor = useChatProcessor({ chat, services, settings });
  if (!processor) {
    return null;
  }

  // TODO(burdon): Add attention attributes.
  return (
    <StackItem.Content classNames='container-max-width'>
      <Chat.Root chat={chat} processor={processor}>
        <Chat.Thread />
        <div className='pbe-4 pis-2 pie-2'>
          <Chat.Prompt
            {...chatProps}
            classNames='border border-subduedSeparator rounded-md'
            preset={preset?.id}
            online={online}
            onChangeOnline={setOnline}
          />
        </div>
      </Chat.Root>
    </StackItem.Content>
  );
};

export default ChatContainer;
