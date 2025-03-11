//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, useCapabilities, useCapability } from '@dxos/app-framework';
import { TranscriptionCapabilities } from '@dxos/plugin-transcription';
import { StackItem } from '@dxos/react-ui-stack';

import { ThreadContainer } from './Thread';
import { ASSISTANT_PLUGIN } from '../meta';
import { type AutomationSettingsProps, type AIChatType } from '../types';

// TODO(burdon): Attention.
export const ChatContainer = ({ chat, role }: { chat: AIChatType; role: string }) => {
  const transcription = useCapabilities(TranscriptionCapabilities.Transcription).length > 0;
  const settings = useCapability(Capabilities.SettingsStore).getStore<AutomationSettingsProps>(
    ASSISTANT_PLUGIN,
  )?.value;

  return (
    <StackItem.Content toolbar={false} role={role} classNames='mli-auto w-full max-w-[50rem]'>
      <ThreadContainer chat={chat} settings={settings} transcription={transcription} />
    </StackItem.Content>
  );
};

export default ChatContainer;
