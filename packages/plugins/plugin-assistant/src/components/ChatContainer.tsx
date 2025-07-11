//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, useCapabilities, useCapability } from '@dxos/app-framework';
import { type AssociatedArtifact } from '@dxos/artifact';
import { TranscriptionCapabilities } from '@dxos/plugin-transcription';
import { useTranslation } from '@dxos/react-ui';
import { StackItem } from '@dxos/react-ui-stack';

import { Chat } from './Chat';
import { meta } from '../meta';
import { type AssistantSettingsProps, type AIChatType } from '../types';

export type ChatContainerProps = {
  role: string;
  chat: AIChatType;
  artifact?: AssociatedArtifact;
};

// TODO(burdon): Attention.
export const ChatContainer = ({ role, chat, artifact }: ChatContainerProps) => {
  const { t } = useTranslation(meta.id);
  const settings = useCapability(Capabilities.SettingsStore).getStore<AssistantSettingsProps>(meta.id)?.value;
  const transcription = useCapabilities(TranscriptionCapabilities.Transcriber).length > 0;

  return (
    <StackItem.Content role={role} classNames='container-max-width'>
      <Chat.Root part='deck' chat={chat} settings={settings} artifact={artifact}>
        <Chat.Thread transcription={transcription} />
        <Chat.Prompt placeholder={t('prompt placeholder')} />
      </Chat.Root>
    </StackItem.Content>
  );
};

export default ChatContainer;
