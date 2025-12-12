//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useState } from 'react';

import { Capabilities } from '@dxos/app-framework';
import { useCapability } from '@dxos/app-framework/react';
import { Obj } from '@dxos/echo';
import { useTranslation } from '@dxos/react-ui';
import { ChatDialog as NaturalChatDialog } from '@dxos/react-ui-chat';

import { useBlueprintRegistry, useChatProcessor, useChatServices, useOnline, usePresets } from '../hooks';
import { meta } from '../meta';
import { type Assistant } from '../types';

import { Chat, type ChatRootProps } from './Chat';

export type ChatDialogProps = {
  chat?: Assistant.Chat;
};

export const ChatDialog = ({ chat }: ChatDialogProps) => {
  const { t } = useTranslation(meta.id);

  const db = chat && Obj.getDatabase(chat);
  const settings = useCapability(Capabilities.SettingsStore).getStore<Assistant.Settings>(meta.id)?.value;
  const services = useChatServices({ id: db?.spaceId, chat });
  const [online, setOnline] = useOnline();
  const { preset, ...chatProps } = usePresets(online);
  const blueprintRegistry = useBlueprintRegistry();
  const processor = useChatProcessor({
    chat,
    preset,
    services,
    blueprintRegistry,
    settings,
  });

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
      <NaturalChatDialog.Root open={open} expanded={expanded} onOpenChange={setOpen}>
        <NaturalChatDialog.Header title={t('assistant dialog title')} />
        <NaturalChatDialog.Content>
          <Chat.Thread />
        </NaturalChatDialog.Content>
        <NaturalChatDialog.Footer classNames='p-1.5'>
          <Chat.Prompt {...chatProps} preset={preset?.id} online={online} onOnlineChange={setOnline} expandable />
        </NaturalChatDialog.Footer>
      </NaturalChatDialog.Root>
    </Chat.Root>
  );
};

export default ChatDialog;
