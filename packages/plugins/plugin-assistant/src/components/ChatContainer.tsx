//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, useCapabilities, useCapability } from '@dxos/app-framework';
import { type AssociatedArtifact } from '@dxos/artifact';
import { getSpace } from '@dxos/client/echo';
import { TranscriptionCapabilities } from '@dxos/plugin-transcription';
import { useTranslation } from '@dxos/react-ui';
import { StackItem } from '@dxos/react-ui-stack';

import { Chat } from './Chat';
import { useChatProcessor, useServiceContainer } from '../hooks';
import { meta } from '../meta';
import { type AssistantSettingsProps, type AIChatType } from '../types';

export type ChatContainerProps = {
  role: string;
  chat: AIChatType;
  artifact?: AssociatedArtifact;
};

export const ChatContainer = ({ role, chat, artifact }: ChatContainerProps) => {
  const { t } = useTranslation(meta.id);
  const space = getSpace(chat);
  const settings = useCapability(Capabilities.SettingsStore).getStore<AssistantSettingsProps>(meta.id)?.value;
  const transcription = useCapabilities(TranscriptionCapabilities.Transcriber).length > 0;
  const serviceContainer = useServiceContainer({ space });
<<<<<<< HEAD
  const processor = useChatProcessor({ part: 'deck', serviceContainer, settings });
||||||| d7f239a172
  const processor = useCapability(Capabilities.SettingsStore).getStore<AssistantSettingsProps>(ASSISTANT_PLUGIN)?.value;
=======
  const processor = useChatProcessor({ part: 'deck', chat, serviceContainer, settings });
>>>>>>> origin/main

  // TODO(burdon): Add attention attributes.
  return (
    <StackItem.Content role={role} classNames='container-max-width'>
      <Chat.Root chat={chat} artifact={artifact} processor={processor}>
        <Chat.Thread transcription={transcription} />
        <Chat.Prompt placeholder={t('prompt placeholder')} />
      </Chat.Root>
    </StackItem.Content>
  );
};

export default ChatContainer;
