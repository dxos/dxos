//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, useCapability } from '@dxos/app-framework';
import { type AssociatedArtifact } from '@dxos/blueprints';
import { getSpace } from '@dxos/client/echo';
import { StackItem } from '@dxos/react-ui-stack';

import { Chat } from './Chat';
import { useChatProcessor, useChatServices } from '../hooks';
import { meta } from '../meta';
import { type Assistant } from '../types';

export type ChatContainerProps = {
  role: string;
  chat: Assistant.Chat;
  artifact?: AssociatedArtifact;
};

export const ChatContainer = ({ role, chat, artifact }: ChatContainerProps) => {
  const space = getSpace(chat);
  const settings = useCapability(Capabilities.SettingsStore).getStore<Assistant.Settings>(meta.id)?.value;
  const services = useChatServices({ space });
  const processor = useChatProcessor({ chat, services, settings });
  if (!processor) {
    return null;
  }

  // TODO(burdon): Add attention attributes.
  return (
    <StackItem.Content classNames='container-max-width'>
      <Chat.Root chat={chat} processor={processor} artifact={artifact}>
        <Chat.Thread />
        <div className='pbe-4 pis-2 pie-2'>
          <Chat.Prompt classNames='border border-subduedSeparator rounded-md' />
        </div>
      </Chat.Root>
    </StackItem.Content>
  );
};

export default ChatContainer;
