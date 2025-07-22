//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useState } from 'react';

import { useCapability, Capabilities } from '@dxos/app-framework';
import { getSpace } from '@dxos/client/echo';
import { useTranslation } from '@dxos/react-ui';
import { ChatDialog as NativeChatDialog } from '@dxos/react-ui-chat';

import { Chat, type ChatRootProps } from './Chat';
import { useChatProcessor, useChatServices } from '../hooks';
import { meta } from '../meta';
import { type Assistant } from '../types';

export type ChatDialogProps = {
  chat?: Assistant.Chat;
};

export const ChatDialog = ({ chat }: ChatDialogProps) => {
  const { t } = useTranslation(meta.id);

  const space = getSpace(chat);
  const settings = useCapability(Capabilities.SettingsStore).getStore<Assistant.Settings>(meta.id)?.value;
  const services = useChatServices({ space });
  const processor = useChatProcessor({ part: 'dialog', chat, services, settings });

  // TODO(burdon): Refocus when open.
  const [open, setOpen] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const handleEvent = useCallback<NonNullable<ChatRootProps['onEvent']>>((event) => {
    switch (event.type) {
      case 'submit':
      case 'thread-open':
        setOpen(true);
        setExpanded(true);
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
      <NativeChatDialog.Root open={open} expanded={expanded} onOpenChange={setOpen}>
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
