//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useState } from 'react';

import { useCapability, Capabilities } from '@dxos/app-framework';
import { getSpace } from '@dxos/client/echo';
import { useTranslation } from '@dxos/react-ui';
import { ChatDialog as NativeChatDialog } from '@dxos/react-ui-chat';

import { Chat, type ChatRootProps } from './Chat';
import { useChatProcessor, useServiceContainer } from '../hooks';
import { meta } from '../meta';
import { type AssistantSettingsProps, type AIChatType } from '../types';

export type ChatDialogProps = {
  chat?: AIChatType;
};

export const ChatDialog = ({ chat }: ChatDialogProps) => {
  const { t } = useTranslation(meta.id);

  const space = getSpace(chat);
  const settings = useCapability(Capabilities.SettingsStore).getStore<AssistantSettingsProps>(meta.id)?.value;
  const serviceContainer = useServiceContainer({ space });
  const processor = useChatProcessor({ part: 'deck', chat, serviceContainer, settings });

  // TODO(burdon): Refocus when open.
  const [open, setOpen] = useState(true);
  const handleEvent = useCallback<NonNullable<ChatRootProps['onEvent']>>((event) => {
    switch (event.type) {
      case 'submit':
      case 'thread-open':
        setOpen(true);
        break;

      case 'thread-close':
        setOpen(false);
        break;
    }
  }, []);

  if (!chat || !processor) {
    return null;
  }

  return (
    <Chat.Root chat={chat} processor={processor} onEvent={handleEvent}>
      <NativeChatDialog.Root open={open} onOpenChange={setOpen}>
        <NativeChatDialog.Header title={t('assistant dialog title')} />
        <NativeChatDialog.Content>
          <Chat.Thread />
        </NativeChatDialog.Content>
        <NativeChatDialog.Footer>
          <Chat.Prompt expandable />
        </NativeChatDialog.Footer>
      </NativeChatDialog.Root>
    </Chat.Root>
  );
};

export default ChatDialog;
