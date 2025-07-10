//
// Copyright 2025 DXOS.org
//

import React, { type FC } from 'react';

import { Capabilities, useCapabilities, useCapability } from '@dxos/app-framework';
import { type AssociatedArtifact } from '@dxos/artifact';
import { TranscriptionCapabilities } from '@dxos/plugin-transcription';
import { StackItem } from '@dxos/react-ui-stack';

import { ThreadRoot } from './Thread';
import { ASSISTANT_PLUGIN } from '../meta';
import { type AssistantSettingsProps, type AIChatType } from '../types';

export type ChatContainerProps = {
  role: string;
  chat: AIChatType;
  associatedArtifact?: AssociatedArtifact;
};

// TODO(burdon): Attention.
export const ChatContainer: FC<ChatContainerProps> = ({ role, chat, associatedArtifact }) => {
  const transcription = useCapabilities(TranscriptionCapabilities.Transcriber).length > 0;
  const settings = useCapability(Capabilities.SettingsStore).getStore<AssistantSettingsProps>(ASSISTANT_PLUGIN)?.value;

  return (
    <StackItem.Content role={role} classNames='container-max-width'>
      <ThreadRoot
        chat={chat}
        settings={settings}
        transcription={transcription}
        associatedArtifact={associatedArtifact}
      />
    </StackItem.Content>
  );
};

export default ChatContainer;
