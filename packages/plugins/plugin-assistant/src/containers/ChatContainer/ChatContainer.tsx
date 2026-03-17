//
// Copyright 2025 DXOS.org
//

import React, { forwardRef, useEffect, useRef } from 'react';

import { Capabilities } from '@dxos/app-framework';
import { useAtomCapability, useCapability } from '@dxos/app-framework/ui';
import { getObjectPathFromObject } from '@dxos/app-toolkit';
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

  const registry = useCapability(Capabilities.AtomRegistry);
  const stateAtom = useCapability(AssistantCapabilities.State);
  const pendingSubmitted = useRef(false);
  useEffect(() => {
    if (!processor || !chat || pendingSubmitted.current) {
      return;
    }

    const chatPath = getObjectPathFromObject(chat);
    const state = registry.get(stateAtom);
    const pendingPrompt = state.pendingPrompts[chatPath];
    if (pendingPrompt) {
      pendingSubmitted.current = true;
      registry.update(stateAtom, (current) => {
        const { [chatPath]: _, ...rest } = current.pendingPrompts;
        return { ...current, pendingPrompts: rest };
      });
      void processor.request({ message: pendingPrompt });
    }
  }, [processor, chat, registry, stateAtom]);

  if (!processor) {
    return null;
  }

  return (
    <ChatComponent.Root db={space?.db} chat={chat} processor={processor} onEvent={onEvent}>
      <Panel.Root role={role} classNames='dx-document' ref={forwardedRef}>
        <Panel.Toolbar>
          <ChatComponent.Toolbar companionTo={companionTo} />
        </Panel.Toolbar>
        <Panel.Content>
          <ChatComponent.Viewport>
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
