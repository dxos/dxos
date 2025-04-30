//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, useCapabilities, useCapability } from '@dxos/app-framework';
import { type AssociatedArtifact } from '@dxos/artifact';
import { TranscriptionCapabilities } from '@dxos/plugin-transcription';
import { StackItem } from '@dxos/react-ui-stack';

import { ThreadContainer } from './Thread';
import { ASSISTANT_PLUGIN } from '../meta';
import { type AssistantSettingsProps, type AIChatType } from '../types';

// TODO(burdon): Attention.
export const ChatContainer = ({
  role,
  chat,
  associatedArtifact,
}: {
  role: string;
  chat: AIChatType;
  associatedArtifact?: AssociatedArtifact;
}) => {
  const transcription = useCapabilities(TranscriptionCapabilities.Transcriber).length > 0;
  const settings = useCapability(Capabilities.SettingsStore).getStore<AssistantSettingsProps>(ASSISTANT_PLUGIN)?.value;

  return (
    <StackItem.Content role={role} classNames='container-max-width'>
      <ThreadContainer
        chat={chat}
        settings={settings}
        transcription={transcription}
        associatedArtifact={associatedArtifact}
      />
    </StackItem.Content>
  );
};

export default ChatContainer;
