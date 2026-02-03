//
// Copyright 2025 DXOS.org
//

import React, { forwardRef } from 'react';

import { type SurfaceComponentProps, useAtomCapability } from '@dxos/app-framework/react';
import { type Space, getSpace } from '@dxos/client/echo';
import { type Obj } from '@dxos/echo';
import { Layout } from '@dxos/react-ui-mosaic';

import { useBlueprintRegistry, useChatProcessor, useChatServices, useOnline, usePresets } from '../hooks';
import { type Assistant, AssistantCapabilities } from '../types';

import { Chat, type ChatRootProps } from './Chat';

export type ChatContainerProps = SurfaceComponentProps<
  Assistant.Chat | undefined,
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
      <Chat.Root db={space?.db} chat={chat} processor={processor} onEvent={onEvent}>
        <Chat.Toolbar companionTo={companionTo} />
        <Chat.Viewport classNames='container-max-width'>
          <Chat.Thread />
          <div role='none' className='p-4'>
            <Chat.Prompt {...chatProps} outline preset={preset?.id} online={online} onOnlineChange={setOnline} />
          </div>
        </Chat.Viewport>
      </Chat.Root>
    </Layout.Main>
  );
});

export default ChatContainer;
