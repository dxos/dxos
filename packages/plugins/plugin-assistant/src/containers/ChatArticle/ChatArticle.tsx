//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Hooks from '@dxos/app-framework/Hooks';
import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { TrajectoryStore } from '@dxos/assistant';
import type * as Chat from '@dxos/assistant/Chat';
import * as Trajectory from '@dxos/compute/Trajectory';
import { Database, Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import * as EffectEx from '@dxos/effect/EffectEx';
import { useIdentity } from '@dxos/halo-react';
import { log } from '@dxos/log';
import * as ClientOperation from '@dxos/plugin-client/ClientOperation';
import { useRegistry } from '@dxos/react-client/echo';
import { type ChatView } from '@dxos/react-ui-assistant';
import * as Button from '@dxos/react-ui/Button';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Layout from '@dxos/react-ui/Layout';
import * as Panel from '@dxos/react-ui/Panel';
import { Merge } from '@dxos/util';

import { Chat as ChatComponent, type ChatRootProps } from '#components';
import { useChatModel, useChatServices, usePlatform, usePresets, usePromptActions, useSelectionContext } from '#hooks';
import { AssistantCapabilities } from '#types';

import { AssistantNamespace } from '../../namespace.ts';

export type ChatArticleProps = Merge<
  Omit<AppSurface.ObjectSectionProps<Chat.Chat>, 'subject'> & {
    subject?: Chat.Chat;
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
    const settings = Hooks.useAtomCapability(AssistantCapabilities.Settings);
    const atomRegistry = Hooks.useCapability(Capabilities.AtomRegistry);
    const stateAtom = Hooks.useCapability(AssistantCapabilities.State);
    // Transient (pre-submit) chats have no database; fall back to the companion's.
    const db = (chat && Obj.getDatabase(chat)) ?? (companionTo && Obj.getDatabase(companionTo));
    const runtime = useChatServices({ id: db?.spaceId });

    const { preset, ...chatProps } = usePresets(settings, chat);
    // Every prompt carries the member's DID, so what they say is attributed to them rather than to a name.
    const identity = useIdentity();
    const sender = useMemo(
      () =>
        identity
          ? { identityDid: identity.did, ...(identity.displayName ? { name: identity.displayName } : {}) }
          : undefined,
      [identity?.did, identity?.displayName],
    );
    // The fork shown in place of main, when the reader opened one.
    const [thread, setThread] = useState<Trajectory.ThreadId>();
    useEffect(() => setThread(undefined), [chat?.id]);
    const chatModel = useChatModel({ db, chat, preset, runtime, registry, settings, sender, thread });
    const [feedSnapshot] = useObject(chat?.feed);
    const handleEvent = useCallback<NonNullable<ChatRootProps['onEvent']>>(
      (event) => {
        if (event.type === 'open-fork') {
          setThread(Trajectory.ThreadId.make(event.thread));
        }
        onEvent?.(event);
      },
      [onEvent],
    );
    const handleMergeFork = useCallback(() => {
      const feed = Obj.getReactiveOrUndefined(feedSnapshot);
      if (!feed || !db || thread === undefined) {
        return;
      }
      void EffectEx.runPromise(TrajectoryStore.mergeFork(feed, thread).pipe(Effect.provide(Database.layer(db))))
        .then(() => setThread(undefined))
        .catch((err: unknown) => log.catch(err));
    }, [feedSnapshot, db, thread]);
    const { t } = UiHooks.useTranslation(AssistantNamespace.key);
    const getContext = useSelectionContext(companionTo);

    const [chatViewType] = useObject(chat, 'viewType');
    const viewType = (chatViewType as ChatView | undefined) ?? settings.chatView;

    const { invokePromise } = Hooks.useOperationInvoker();
    const handleViewUsage = useCallback(() => {
      void invokePromise(ClientOperation.OpenUsage, undefined);
    }, [invokePromise]);

    // Hosted by this surface's own graph node, which every host passes as `nodeId`; a companion's
    // `attendableId` is its host plank's.
    const prompt = usePromptActions(nodeId);

    // Reset the one-shot guard when the target conversation changes, so a pending prompt for a new
    // `attendableId` is still auto-submitted within the same mount.
    const pendingSubmitted = useRef(false);
    useEffect(() => {
      pendingSubmitted.current = false;
    }, [attendableId]);

    useEffect(() => {
      if (!chatModel || !attendableId || pendingSubmitted.current) {
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

        void chatModel.request({ message: pendingPrompt });
      }
    }, [chatModel, attendableId, atomRegistry, stateAtom]);

    return (
      <ChatComponent.Root
        chat={chat}
        db={db}
        chatModel={chatModel}
        debug={debug}
        getContext={getContext}
        onEvent={handleEvent}
        onSubmit={onSubmit}
      >
        <Panel.Root role={role} ref={forwardedRef}>
          <Panel.Header>
            <ChatComponent.Toolbar classNames='dx-document' attendableId={attendableId} companionTo={companionTo} />
          </Panel.Header>
          <Panel.Body asChild>
            <ChatComponent.Content>
              <Layout.Flex classNames='dx-expand relative'>
                {/* Thread outline (Table of Contents). */}
                {!mobile && <ChatComponent.Outline classNames='absolute left-0 top-1/2 -translate-y-1/2 z-10' />}

                {thread !== undefined && (
                  <div
                    className='absolute top-0 left-0 right-0 z-10 dx-document flex items-center gap-2 px-3 py-1 bg-base-surface'
                    data-testid='assistant.fork-bar'
                  >
                    <Button.Root
                      icon='ph--arrow-left--regular'
                      label={t('fork-back.label')}
                      variant='ghost'
                      size='sm'
                      data-testid='assistant.fork-back'
                      onClick={() => setThread(undefined)}
                    />
                    <span className='grow truncate text-sm text-fg-muted'>{t('fork-bar.label')}</span>
                    <Button.Root
                      icon='ph--git-merge--regular'
                      label={t('fork-merge.label')}
                      variant='ghost'
                      size='sm'
                      data-testid='assistant.fork-merge'
                      onClick={handleMergeFork}
                    />
                  </div>
                )}

                {/* Main thread. */}
                <ChatComponent.Thread
                  viewType={viewType}
                  tailLines={4}
                  showTokens={settings.showTokens}
                  onViewUsage={handleViewUsage}
                />

                {/** Floating info. */}
                {!mobile && (
                  <Layout.Grid
                    cols={['fill', 'auto']}
                    gap='sm'
                    classNames='absolute bottom-0 left-0 right-0 dx-document px-3 pb-2'
                    data-testid='assistant.chat-status'
                  >
                    {/* Pinned to their columns: either renders nothing while idle, which would move the other over. */}
                    <ChatComponent.Activity classNames='col-start-1 self-center' />
                    <ChatComponent.Status classNames='col-start-2 justify-self-end bg-input-surface rounded-sm' />
                  </Layout.Grid>
                )}
              </Layout.Flex>

              <Layout.Flex column classNames='dx-document px-2 pb-2'>
                {mobile && (
                  <Layout.Grid cols={2}>
                    <ChatComponent.Activity />
                  </Layout.Grid>
                )}

                <ChatComponent.Prompt
                  {...chatProps}
                  outline
                  autoFocus={!companionTo}
                  attendableId={attendableId}
                  companionTo={companionTo}
                  customActions={prompt.actions}
                  nodeId={prompt.nodeId}
                  preset={preset?.id}
                />
              </Layout.Flex>
            </ChatComponent.Content>
          </Panel.Body>
        </Panel.Root>
      </ChatComponent.Root>
    );
  },
);

ChatArticle.displayName = 'ChatArticle';
