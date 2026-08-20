//
// Copyright 2025 DXOS.org
//

import React, { forwardRef, useCallback, useEffect, useRef } from 'react';

import { Provider } from '@dxos/ai';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import { useAtomCapability, useCapability, useOperationInvoker } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { type Chat as ChatType } from '@dxos/assistant-toolkit';
import { getSpace } from '@dxos/client/echo';
import { type Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { ClientOperation } from '@dxos/plugin-client';
import { useRegistry } from '@dxos/react-client/echo';
import { Panel } from '@dxos/react-ui';
import { type ChatView } from '@dxos/react-ui-assistant';
import { Merge } from '@dxos/util';

import { Chat as ChatComponent, type ChatRootProps } from '#components';
import { useChatProcessor, useChatServices, usePlatform, usePresets, useSelectionContext } from '#hooks';
import { AssistantCapabilities } from '#types';

export type ChatArticleProps = Merge<
  AppSurface.ObjectSectionProps<ChatType.Chat> & {
    companionTo?: Obj.Unknown;
  },
  Pick<ChatRootProps, 'debug' | 'onEvent' | 'onSubmit'>
>;

export const ChatArticle = forwardRef<HTMLDivElement, ChatArticleProps>(
  ({ role, attendableId, subject: chat, companionTo, debug, onEvent, onSubmit }, forwardedRef) => {
    const registry = useRegistry();
    // The marker rail is a hover/precision target pinned to the thread's left edge, and the status
    // pill floats over the last turn — on a phone the rail has nowhere to live outside the text and
    // the pill covers the reply it reports on. Neither has a toggle to orphan; both are passive.
    const mobile = usePlatform() === 'mobile';
    const settings = useAtomCapability(AssistantCapabilities.Settings);
    const atomRegistry = useCapability(Capabilities.AtomRegistry);
    const stateAtom = useCapability(AssistantCapabilities.State);
    // Transient (pre-submit) chats have no database; fall back to the companion's space.
    const space = getSpace(chat) ?? getSpace(companionTo);
    const runtime = useChatServices({ id: space?.id });

    const { preset, ...chatProps } = usePresets(settings);
    // The provider is configured in settings; the chat surfaces it as a read-only online indicator.
    const online = preset?.provider === Provider.edge.id;
    const processor = useChatProcessor({ space, chat, preset, runtime, registry, settings });
    const getContext = useSelectionContext(companionTo);

    // Subscribe to the view type via `useObject` so the thread re-renders when ChatOptions changes it;
    // a direct `chat.viewType` read in render does not establish a reactive dependency.
    const [chatViewType] = useObject(chat, 'viewType');
    const viewType = (chatViewType as ChatView | undefined) ?? settings.chatView;

    const { invokePromise } = useOperationInvoker();
    const handleViewUsage = useCallback(() => {
      void invokePromise(ClientOperation.OpenUsage, undefined);
    }, [invokePromise]);

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
        db={space?.db}
        processor={processor}
        debug={debug}
        getContext={getContext}
        onEvent={onEvent}
        onSubmit={onSubmit}
      >
        <Panel.Root role={role} ref={forwardedRef}>
          <Panel.Toolbar>
            <ChatComponent.Toolbar classNames='dx-document' attendableId={attendableId} companionTo={companionTo} />
          </Panel.Toolbar>
          <Panel.Content asChild>
            <ChatComponent.Content>
              <div className='dx-container relative'>
                {/* Thread outline. */}
                <ChatComponent.Outline classNames='absolute left-0 top-1/2 -translate-y-1/2 z-10' />
                {/* Main thread. */}
                <ChatComponent.Thread viewType={viewType} tailLines={4} onViewUsage={handleViewUsage} />
                {/* Floating thread status. */}
                {viewType !== 'summary' && (
                  <div className='absolute bottom-2 left-0 right-0'>
                    <div className='dx-document px-4'>
                      <ChatComponent.Status classNames='px-3 rounded-sm bg-group-surface' />
                    </div>
                  </div>
                )}
              </div>
              <div className='dx-document flex flex-col px-4 pb-4'>
                <div className='px-4'>
                  <ChatComponent.TaskList classNames='border border-separator border-b-0 rounded-sm rounded-b-none text-description' />
                </div>
                <ChatComponent.Prompt
                  {...chatProps}
                  outline
                  online={online}
                  preset={preset?.id}
                  companionTo={companionTo}
                />
              </div>
            </ChatComponent.Content>
          </Panel.Content>
        </Panel.Root>
      </ChatComponent.Root>
    );
  },
);

ChatArticle.displayName = 'ChatArticle';
