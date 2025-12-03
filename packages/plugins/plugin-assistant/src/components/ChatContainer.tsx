//
// Copyright 2025 DXOS.org
//

import React, { forwardRef } from 'react';

import { Capabilities } from '@dxos/app-framework';
import { useCapability } from '@dxos/app-framework/react';
import { type Space, getSpace } from '@dxos/client/echo';
import { type Obj } from '@dxos/echo';
import { StackItem } from '@dxos/react-ui-stack';

import { useBlueprintRegistry, useChatProcessor, useChatServices, useOnline, usePresets } from '../hooks';
import { meta } from '../meta';
import { type Assistant } from '../types';

import { Chat, type ChatRootProps } from './Chat';

export type ChatContainerProps = {
  role?: string;
  space?: Space;
  chat?: Assistant.Chat;
  companionTo?: Obj.Any;
} & Pick<ChatRootProps, 'onEvent'>;

export const ChatContainer = forwardRef<HTMLDivElement, ChatContainerProps>((props, forwardedRef) => {
  const { space: spaceProp, chat, companionTo, onEvent } = props;
  const space = spaceProp ?? getSpace(chat);
  const settings = useCapability(Capabilities.SettingsStore).getStore<Assistant.Settings>(meta.id)?.value;
  const services = useChatServices({ space, chat });
  const [online, setOnline] = useOnline();
  const { preset, ...chatProps } = usePresets(online);
  const blueprintRegistry = useBlueprintRegistry();
  const processor = useChatProcessor({
    space,
    chat,
    preset,
    services,
    blueprintRegistry,
    settings,
  });

  if (!processor) {
    return null;
  }

  return (
    <StackItem.Content toolbar ref={forwardedRef}>
      <Chat.Root space={space} chat={chat} processor={processor} onEvent={onEvent}>
        <Chat.Toolbar companionTo={companionTo} />
        <Chat.Viewport classNames='container-max-width'>
          <Chat.Thread />
          <div role='none' className='p-4'>
            <Chat.Prompt {...chatProps} outline preset={preset?.id} online={online} onOnlineChange={setOnline} />
          </div>
        </Chat.Viewport>
      </Chat.Root>
    </StackItem.Content>
  );
});

export default ChatContainer;
