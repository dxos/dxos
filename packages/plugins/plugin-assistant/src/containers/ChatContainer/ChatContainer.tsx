//
// Copyright 2025 DXOS.org
//

import React, { forwardRef } from 'react';

import { useAtomCapability } from '@dxos/app-framework/ui';
import { type SurfaceComponentProps } from '@dxos/app-toolkit/ui';
import { type Space, getSpace } from '@dxos/client/echo';
import { type Obj } from '@dxos/echo';
import { Panel } from '@dxos/react-ui';

import { Chat as ChatComponent, type ChatRootProps } from '../../components';
import { useBlueprintRegistry, useChatProcessor, useChatServices, useOnline, usePresets } from '../../hooks';
import { AssistantCapabilities, type ChatType } from '../../types';

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
    <ChatComponent.Root db={space?.db} chat={chat} processor={processor} onEvent={onEvent}>
      <Panel.Root role={role} ref={forwardedRef}>
        <Panel.Toolbar asChild>
          <ChatComponent.Toolbar companionTo={companionTo} />
        </Panel.Toolbar>
        <Panel.Content asChild>
          <ChatComponent.Viewport classNames='dx-article'>
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
        </Panel.Content>
      </Panel.Root>
    </ChatComponent.Root>
  );
});
