//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, useCapability } from '@dxos/app-framework';
import { type AssociatedArtifact } from '@dxos/artifact';
import { getSpace } from '@dxos/client/echo';
import { StackItem } from '@dxos/react-ui-stack';

import { Chat } from './Chat';
import { useChatProcessor, useServiceContainer } from '../hooks';
import { meta } from '../meta';
import { type Assistant, type AssistantSettingsProps } from '../types';

export type ChatContainerProps = {
  role: string;
  chat: Assistant.Chat;
  artifact?: AssociatedArtifact;
};

export const ChatContainer = ({ role, chat, artifact }: ChatContainerProps) => {
  const space = getSpace(chat);
  const settings = useCapability(Capabilities.SettingsStore).getStore<AssistantSettingsProps>(meta.id)?.value;
  const serviceContainer = useServiceContainer({ space });
  const processor = useChatProcessor({ part: 'deck', chat, serviceContainer, settings });
  if (!processor) {
    return null;
  }

  // TODO(burdon): Add attention attributes.
  return (
    <StackItem.Content role={role} classNames='container-max-width'>
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
