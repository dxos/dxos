//
// Copyright 2025 DXOS.org
//

import React, { useState } from 'react';

import { useCapability, Capabilities, useCapabilities } from '@dxos/app-framework';
import { TranscriptionCapabilities } from '@dxos/plugin-transcription';
import { useTranslation } from '@dxos/react-ui';
import { ChatDialog as NativeChatDialog } from '@dxos/react-ui-chat';

import { Chat } from './Chat';
import { meta } from '../meta';
import { type AssistantSettingsProps, type AIChatType } from '../types';

export type ChatDialogProps = {
  chat?: AIChatType;
};

export const ChatDialog = ({ chat }: ChatDialogProps) => {
  const { t } = useTranslation(meta.id);
  const settings = useCapability(Capabilities.SettingsStore).getStore<AssistantSettingsProps>(meta.id)?.value;
  const transcription = useCapabilities(TranscriptionCapabilities.Transcriber).length > 0;

  // TODO(burdon): Refocus when open.
  const [open, setOpen] = useState(false);

  return (
    <Chat.Root part='dialog' chat={chat} settings={settings} onOpenChange={setOpen}>
      <NativeChatDialog.Root open={open} onOpenChange={setOpen}>
        <NativeChatDialog.Header title={t('assistant dialog title')} />
        <NativeChatDialog.Content>
          <Chat.Thread transcription={transcription} />
        </NativeChatDialog.Content>
        <NativeChatDialog.Footer>
          <Chat.Prompt placeholder={t('prompt placeholder')} />
        </NativeChatDialog.Footer>
      </NativeChatDialog.Root>
    </Chat.Root>
  );
};

export default ChatDialog;
