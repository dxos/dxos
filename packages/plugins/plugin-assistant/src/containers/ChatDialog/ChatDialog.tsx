//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useState } from 'react';

import { useAtomCapability } from '@dxos/app-framework/ui';
import type * as ChatTypes from '@dxos/assistant/Chat';
import { Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { useRegistry } from '@dxos/react-client/echo';
import { useTranslation } from '@dxos/react-ui';
import { type ChatView } from '@dxos/react-ui-assistant';
import { ChatDialog as NaturalChatDialog } from '@dxos/react-ui-chat';

import { Chat, type ChatRootProps } from '#components';
import { useChatProcessor, useChatServices, usePresets } from '#hooks';
import { meta } from '#meta';
import { AssistantCapabilities } from '#types';

export type ChatDialogProps = {
  chat?: ChatTypes.Chat;
};

export const ChatDialog = ({ chat }: ChatDialogProps) => {
  const { t } = useTranslation(meta.profile.key);

  const db = chat && Obj.getDatabase(chat);
  const settings = useAtomCapability(AssistantCapabilities.Settings);
  const runtime = useChatServices({ id: db?.spaceId });
  const { preset, ...chatProps } = usePresets(settings);
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
          <Chat.Thread viewType={(chatViewType as ChatView | undefined) ?? settings.chatView} />
        </NaturalChatDialog.Content>
        <NaturalChatDialog.Footer classNames='p-1.5'>
          {/* Queued prompts the agent has not taken up yet, stacked right above the composer. */}
          <Chat.Queue classNames='pb-1' />
          <Chat.Prompt {...chatProps} preset={preset?.id} expandable />
        </NaturalChatDialog.Footer>
      </NaturalChatDialog.Root>
    </Chat.Root>
  );
};

ChatDialog.displayName = 'ChatDialog';
