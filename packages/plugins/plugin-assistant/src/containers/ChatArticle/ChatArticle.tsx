//
// Copyright 2025 DXOS.org
//

import React, { forwardRef, useEffect, useRef } from 'react';

import { Capabilities } from '@dxos/app-framework';
import { useAtomCapability, useCapability } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { getSpace } from '@dxos/client/echo';
import { type Obj } from '@dxos/echo';
import { useObject, useRegistry } from '@dxos/react-client/echo';
import { Panel } from '@dxos/react-ui';

import { Chat as ChatComponent, type ChatRootProps } from '#components';
import { useChatProcessor, useChatServices, useOnline, usePresets } from '#hooks';
import { type Assistant, AssistantCapabilities, type ChatType } from '#types';

export type ChatArticleProps = AppSurface.ObjectSectionProps<ChatType.Chat> & {
  companionTo?: Obj.Unknown;
} & Pick<ChatRootProps, 'onEvent' | 'onSubmit'>;

export const ChatArticle = forwardRef<HTMLDivElement, ChatArticleProps>(
  ({ role, attendableId, subject: chat, companionTo, onEvent, onSubmit }, forwardedRef) => {
    const registry = useRegistry();
    const settings = useAtomCapability(AssistantCapabilities.Settings);
    const atomRegistry = useCapability(Capabilities.AtomRegistry);
    const stateAtom = useCapability(AssistantCapabilities.State);
    // Transient (pre-submit) chats have no database; fall back to the companion's space.
    const space = getSpace(chat) ?? getSpace(companionTo);
    const runtime = useChatServices({ id: space?.id });

    const [online, setOnline] = useOnline();
    const { preset, ...chatProps } = usePresets(online);
    const processor = useChatProcessor({ space, chat, preset, runtime, registry, settings });

    // Subscribe to the view type via `useObject` so the thread re-renders when ChatOptions changes it;
    // a direct `chat.viewType` read in render does not establish a reactive dependency.
    const [chatViewType] = useObject(chat, 'viewType');
    const viewType = (chatViewType as Assistant.ChatView | undefined) ?? settings.chatView;

    // Reset the one-shot guard when the target conversation changes, so a pending prompt for a new
    // `attendableId` is still auto-submitted within the same mount.
    const pendingSubmitted = useRef(false);
    useEffect(() => {
      pendingSubmitted.current = false;
    }, [attendableId]);

    useEffect(() => {
      if (!processor || !attendableId || pendingSubmitted.current) {
        return;
      }

      const state = atomRegistry.get(stateAtom);
      const pendingPrompt = state.pendingPrompts[attendableId];
      if (pendingPrompt) {
        pendingSubmitted.current = true;
        atomRegistry.update(stateAtom, (current) => {
          const { [attendableId]: _, ...rest } = current.pendingPrompts;
          return { ...current, pendingPrompts: rest };
        });

        void processor.request({ message: pendingPrompt });
      }
    }, [processor, attendableId, atomRegistry, stateAtom]);

    if (!processor) {
      return null;
    }

    return (
      <ChatComponent.Root
        chat={chat}
        feed={chat?.feed.target}
        db={space?.db}
        processor={processor}
        onEvent={onEvent}
        onSubmit={onSubmit}
      >
        <Panel.Root role={role} ref={forwardedRef}>
          <Panel.Toolbar className='bg-toolbar-surface'>
            <ChatComponent.Toolbar classNames='dx-document' attendableId={attendableId} companionTo={companionTo} />
          </Panel.Toolbar>
          <Panel.Content>
            <ChatComponent.Content>
              <div className='dx-container relative'>
                <ChatComponent.Thread viewType={viewType} />
                {viewType !== 'summary' && (
                  <div className='absolute bottom-2 left-0 right-0'>
                    <div className='dx-document px-4'>
                      <ChatComponent.Status classNames='px-3 rounded-sm bg-group-surface' />
                    </div>
                  </div>
                )}
              </div>
              <div className='dx-document px-4 pb-4'>
                <div className='flex flex-col items-center py-2 overflow-hidden'>
                  <ChatComponent.TaskList classNames='max-h-[120px] border border-separator rounded-sm text-description' />
                </div>
                <ChatComponent.Prompt
                  {...chatProps}
                  outline
                  preset={preset?.id}
                  online={online}
                  onOnlineChange={setOnline}
                />
              </div>
            </ChatComponent.Content>
          </Panel.Content>
        </Panel.Root>
      </ChatComponent.Root>
    );
  },
);
