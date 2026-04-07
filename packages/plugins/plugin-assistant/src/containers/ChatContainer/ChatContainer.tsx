//
// Copyright 2025 DXOS.org
//

import React, { forwardRef, useEffect, useRef } from 'react';

import { Capabilities } from '@dxos/app-framework';
import { useAtomCapability, useCapability } from '@dxos/app-framework/ui';
import { type ObjectSurfaceProps } from '@dxos/app-toolkit/ui';
import { type Space, getSpace } from '@dxos/client/echo';
import { Feed, type Obj } from '@dxos/echo';
import { Panel } from '@dxos/react-ui';
import { getParentId } from '@dxos/react-ui-attention';

import { Chat as ChatComponent, type ChatRootProps } from '#components';
import { useBlueprintRegistry, useChatProcessor, useChatServices, useOnline, usePresets } from '#hooks';
import { AssistantCapabilities, type ChatType } from '#types';

export type ChatContainerProps = ObjectSurfaceProps<
  ChatType.Chat | undefined,
  {
    space?: Space;
    companionTo?: Obj.Unknown;
  } & Pick<ChatRootProps, 'onEvent'>
>;

export const ChatContainer = forwardRef<HTMLDivElement, ChatContainerProps>((props, forwardedRef) => {
  const { role, attendableId, subject: chat, space: spaceProp, companionTo, onEvent } = props;
  const parentId = attendableId ? getParentId(attendableId) : undefined;
  const space = spaceProp ?? getSpace(chat);
  const settings = useAtomCapability(AssistantCapabilities.Settings);
  const runtime = useChatServices({ id: space?.id });
  const [online, setOnline] = useOnline();
  const { preset, ...chatProps } = usePresets(online);
  const blueprintRegistry = useBlueprintRegistry();
  const processor = useChatProcessor({
    space,
    chat,
    preset,
    runtime,
    blueprintRegistry,
    settings,
  });

  const registry = useCapability(Capabilities.AtomRegistry);
  const stateAtom = useCapability(AssistantCapabilities.State);
  const pendingSubmitted = useRef(false);
  useEffect(() => {
    if (!processor || !attendableId || pendingSubmitted.current) {
      return;
    }

    const state = registry.get(stateAtom);
    const pendingPrompt = state.pendingPrompts[attendableId];
    if (pendingPrompt) {
      pendingSubmitted.current = true;
      registry.update(stateAtom, (current) => {
        const { [attendableId]: _, ...rest } = current.pendingPrompts;
        return { ...current, pendingPrompts: rest };
      });
      void processor.request({ message: pendingPrompt });
    }
  }, [processor, attendableId, registry, stateAtom]);

  const feedTarget = chat?.feed.target;
  const queue = space && feedTarget ? space.queues.get(Feed.getQueueDxn(feedTarget)!) : undefined;

  if (!processor) {
    return null;
  }

  return (
    <ChatComponent.Root db={space?.db} chat={chat} queue={queue} processor={processor} onEvent={onEvent}>
      <Panel.Root role={role} classNames='dx-document' ref={forwardedRef}>
        <Panel.Toolbar className='bg-toolbar-surface'>
          <ChatComponent.Toolbar classNames='dx-document' attendableId={parentId} companionTo={companionTo} />
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
