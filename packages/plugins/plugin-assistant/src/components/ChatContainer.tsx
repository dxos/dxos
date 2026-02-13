//
// Copyright 2025 DXOS.org
//

import React, { forwardRef } from 'react';

import { useAtomCapability } from '@dxos/app-framework/ui';
import { type SurfaceComponentProps } from '@dxos/app-toolkit/ui';
import { type Space, getSpace } from '@dxos/client/echo';
import { type Obj } from '@dxos/echo';
import { Layout } from '@dxos/react-ui-mosaic';

import { useBlueprintRegistry, useChatProcessor, useChatServices, useOnline, usePresets } from '../hooks';
import { AssistantCapabilities, type ChatType } from '../types';

import { Chat as ChatComponent, type ChatRootProps } from './Chat';

export type ChatContainerProps = SurfaceComponentProps<
  ChatType.Chat | undefined,
  {
    space?: Space;
    companionTo?: Obj.Unknown;
  } & Pick<ChatRootProps, 'onEvent'>
>;

export const ChatContainer = forwardRef<HTMLDivElement, ChatContainerProps>((props, forwardedRef) => {
  const { role, subject: chat, space: spaceProp, companionTo, onEvent } = props;
  const space = spaceProp ?? getSpace(chat);
  const settings = useAtomCapability(AssistantCapabilities.Settings);
  const services = useChatServices({ id: space?.id, chat });
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
    <Layout.Main toolbar role={role} ref={forwardedRef}>
      <ChatComponent.Root db={space?.db} chat={chat} processor={processor} onEvent={onEvent}>
        <ChatComponent.Toolbar companionTo={companionTo} />
        <ChatComponent.Viewport classNames='container-max-width'>
          <ChatComponent.Thread />
          <div role='none' className='p-4'>
            <ChatComponent.Prompt
              {...chatProps}
              outline
              preset={preset?.id}
              online={online}
              onOnlineChange={setOnline}
            />
          </div>
        </ChatComponent.Viewport>
      </ChatComponent.Root>
    </Layout.Main>
  );
});

export default ChatContainer;
