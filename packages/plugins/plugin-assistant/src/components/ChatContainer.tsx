//
// Copyright 2025 DXOS.org
//

import React, { forwardRef, useImperativeHandle } from 'react';

import { Capabilities, useCapability } from '@dxos/app-framework';
import { getSpace } from '@dxos/client/echo';
import { Toolbar, useTranslation } from '@dxos/react-ui';
import { StackItem } from '@dxos/react-ui-stack';

import {
  type AiChatProcessor,
  useBlueprintRegistry,
  useChatProcessor,
  useChatServices,
  useOnline,
  usePresets,
} from '../hooks';
import { meta } from '../meta';
import { type Assistant } from '../types';

import { Chat } from './Chat';

export type ChatContainerProps = {
  chat: Assistant.Chat;
  role?: string;
  onChatCreate?: () => void;
};

export const ChatContainer = forwardRef<AiChatProcessor | undefined, ChatContainerProps>(
  ({ chat, onChatCreate }, forwardedRef) => {
    const { t } = useTranslation(meta.id);
    const space = getSpace(chat);
    const settings = useCapability(Capabilities.SettingsStore).getStore<Assistant.Settings>(meta.id)?.value;
    const services = useChatServices({ space, chat });
    const [online, setOnline] = useOnline();
    const { preset, ...chatProps } = usePresets(online);
    const blueprintRegistry = useBlueprintRegistry();
    const processor = useChatProcessor({ space, chat, preset, services, blueprintRegistry, settings });
    useImperativeHandle(forwardedRef, () => processor);

    if (!chat || !processor) {
      return null;
    }

    return (
      <StackItem.Content toolbar classNames='container-max-width'>
        {onChatCreate && (
          <Toolbar.Root>
            <Toolbar.IconButton
              icon='ph--plus--regular'
              iconOnly
              label={t('button new thread')}
              onClick={onChatCreate}
            />
          </Toolbar.Root>
        )}
        <Chat.Root chat={chat} processor={processor}>
          <Chat.Thread />
          <div className='p-2'>
            <Chat.Prompt {...chatProps} outline preset={preset?.id} online={online} onOnlineChange={setOnline} />
          </div>
        </Chat.Root>
      </StackItem.Content>
    );
  },
);

export default ChatContainer;
