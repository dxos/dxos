//
// Copyright 2025 DXOS.org
//

import * as Atom from 'effect/unstable/reactivity/Atom';
import React, { forwardRef, useCallback, useEffect, useMemo, useRef } from 'react';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import { useAtomCapability, useCapability, useOperationInvoker } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { useAppGraph } from '@dxos/app-toolkit/ui';
import type * as ChatType from '@dxos/assistant/Chat';
import { Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { ClientOperation } from '@dxos/plugin-client';
import { useRegistry } from '@dxos/react-client/echo';
import { Panel } from '@dxos/react-ui';
import { type ChatView } from '@dxos/react-ui-assistant';
import { graphActions, isPromptAction } from '@dxos/react-ui-menu';
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
  ({ role, attendableId, nodeId, subject: chat, companionTo, debug, onEvent, onSubmit }, forwardedRef) => {
    const registry = useRegistry();
    // The marker rail is a hover/precision target pinned to the thread's left edge, and the status
    // pill floats over the last turn — on a phone the rail has nowhere to live outside the text and
    // the pill covers the reply it reports on. Neither has a toggle to orphan; both are passive.
    const mobile = usePlatform() === 'mobile';
    const settings = useAtomCapability(AssistantCapabilities.Settings);
    const atomRegistry = useCapability(Capabilities.AtomRegistry);
    const stateAtom = useCapability(AssistantCapabilities.State);
    // Transient (pre-submit) chats have no database; fall back to the companion's.
    const db = Obj.getDatabase(chat) ?? (companionTo && Obj.getDatabase(companionTo));
    const runtime = useChatServices({ id: db?.spaceId });

    const { preset, ...chatProps } = usePresets(settings);
    const processor = useChatProcessor({ db, chat, preset, runtime, registry, settings });
    const getContext = useSelectionContext(companionTo);

    // Subscribe to the view type via `useObject` so the thread re-renders when ChatOptions changes it;
    // a direct `chat.viewType` read in render does not establish a reactive dependency.
    const [chatViewType] = useObject(chat, 'viewType');
    const viewType = (chatViewType as ChatView | undefined) ?? settings.chatView;

    const { invokePromise } = useOperationInvoker();
    const handleViewUsage = useCallback(() => {
      void invokePromise(ClientOperation.OpenUsage, undefined);
    }, [invokePromise]);

    // Actions other plugins filed on this chat's node — the microphone among them — so a contributor
    // reaches the prompt without plugin-assistant importing it (or knowing it exists).
    //
    // Sourced from this surface's own node rather than `attendableId`: a companion shares the host
    // plank's attention id (`CompanionPlank`), so reading actions from it hands a chat attached to a
    // document that document's toolbar — its comment action, and a second copy of its microphone
    // keyed to the document. `nodeId` is the companion node itself, which is where a contributor
    // matching on the chat files them; it falls back to the object for a surface rendered outside a
    // plank. Filtered to the prompt surface for the same reason the id is: an action on the chat
    // acts on the chat, and only some of those belong beside the text being composed.
    const { graph } = useAppGraph();
    const actionNodeId = nodeId ?? Obj.getURI(chat);
    const customActions = useMemo(
      () => Atom.make((get) => graphActions(graph, get, actionNodeId, { filter: isPromptAction })),
      [graph, actionNodeId],
    );

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
        db={db}
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
              <div className='dx-expand relative'>
                {/* Thread outline. */}
                {!mobile && <ChatComponent.Outline classNames='absolute left-0 top-1/2 -translate-y-1/2 z-10' />}
                {/* Main thread. */}
                <ChatComponent.Thread viewType={viewType} tailLines={4} onViewUsage={handleViewUsage} />
                {/* Floating thread status: what the request is doing, above the counters it has run up. */}
                {!mobile && viewType !== 'summary' && (
                  <div data-testid='assistant.chat-status' className='absolute bottom-2 left-0 right-0'>
                    <ChatComponent.StatusStack
                      rowClassNames='dx-document px-4'
                      pillClassNames='px-3 rounded-sm bg-group-surface'
                    />
                  </div>
                )}
              </div>
              <div className='dx-document flex flex-col px-4 pb-4'>
                {/* On mobile (and in the summary view) the floating stack is dropped, so the activity
                    line keeps its in-flow slot above the composer. */}
                {(mobile || viewType === 'summary') && <ChatComponent.Activity classNames='shrink-0' />}
                {/* Queued prompts the agent has not taken up yet, stacked right above the composer. */}
                <ChatComponent.Queue classNames='shrink-0 items-end pb-1' />
                {/* Composer and checklist in one: `Chat.Prompt` owns the disclosure between them. */}
                <ChatComponent.Prompt
                  {...chatProps}
                  outline
                  attendableId={attendableId}
                  companionTo={companionTo}
                  customActions={customActions}
                  nodeId={actionNodeId}
                  preset={preset?.id}
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
