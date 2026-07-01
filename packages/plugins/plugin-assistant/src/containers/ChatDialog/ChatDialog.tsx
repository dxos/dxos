//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useState } from 'react';

import { Provider } from '@dxos/ai';
import { useAtomCapability } from '@dxos/app-framework/ui';
import { type Chat as ChatTypes } from '@dxos/assistant-toolkit';
import { Obj } from '@dxos/echo';
import { useObject, useRegistry } from '@dxos/react-client/echo';
import { useTranslation } from '@dxos/react-ui';
import { ChatDialog as NaturalChatDialog } from '@dxos/react-ui-chat';

import { Chat, type ChatRootProps } from '#components';
import { useChatProcessor, useChatServices, usePresets } from '#hooks';
import { meta } from '#meta';
import { type Assistant, AssistantCapabilities } from '#types';

export type ChatDialogProps = {
  chat?: ChatTypes.Chat;
};

export const ChatDialog = ({ chat }: ChatDialogProps) => {
  const { t } = useTranslation(meta.profile.key);

  const db = chat && Obj.getDatabase(chat);
  const settings = useAtomCapability(AssistantCapabilities.Settings);
  const runtime = useChatServices({ id: db?.spaceId });
  const { preset, ...chatProps } = usePresets(settings);
  const online = preset?.provider === Provider.edge.id;
  const registry = useRegistry();
  const processor = useChatProcessor({ chat, preset, runtime, registry, settings });
  // Subscribe via `useObject` so the thread re-renders when ChatOptions changes the view type.
  const [chatViewType] = useObject(chat, 'viewType');

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
        <NaturalChatDialog.Header title={t('assistant-dialog.title')} />
        <NaturalChatDialog.Content>
          <Chat.Thread viewType={(chatViewType as Assistant.ChatView | undefined) ?? settings.chatView} />
        </NaturalChatDialog.Content>
        <NaturalChatDialog.Footer classNames='p-1.5'>
          <Chat.Prompt {...chatProps} preset={preset?.id} online={online} expandable />
        </NaturalChatDialog.Footer>
      </NaturalChatDialog.Root>
    </Chat.Root>
  );
};
