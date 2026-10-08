//
// Copyright 2026 DXOS.org
//

import React, { useEffect, useMemo, useState } from 'react';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Hooks from '@dxos/app-framework/Hooks';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import type * as Chat from '@dxos/assistant/Chat';
import { Event } from '@dxos/async';
import { type Space, useRegistry } from '@dxos/react-client/echo';
import * as UiHooks from '@dxos/react-ui/Hooks';

import { type ChatEvent, ChatPrompt } from '#components';
import { useChatModel, useChatServices, usePresets } from '#hooks';
import { meta } from '#meta';
import { AssistantCapabilities, AssistantOperation } from '#types';

import { getChatPath } from '../../paths.ts';

type SpaceScopedProps = {
  space?: Space;
};

/**
 * Home article pinned-bottom contributor: the assistant prompt. Backed by an ephemeral in-memory
 * chat whose sole responsibility is to collect the user's text, context bindings, and preset
 * choice, then on submit: persist the chat to the space, queue the text as a pending prompt, and
 * navigate to it. AI generation runs in the opened chat view — the chat model here exists only to
 * back the context-binder UI.
 */
export const SpaceHomePrompt = ({ space }: SpaceScopedProps) => {
  const { t } = UiHooks.useTranslation(meta.profile.key);
  const { invokePromise } = Hooks.useOperationInvoker();

  const registry = useRegistry();
  const atomRegistry = Hooks.useCapability(Capabilities.AtomRegistry);
  const stateAtom = Hooks.useCapability(AssistantCapabilities.State);
  const runtime = useChatServices({ id: space?.id });
  const settings = Hooks.useAtomCapability(AssistantCapabilities.Settings);

  // In-memory backing chat (not yet added to the space). `nonce` forces a fresh chat after submit.
  const [chat, setChat] = useState<Chat.Chat>();
  const [nonce, setNonce] = useState(0);
  const { preset, ...presetProps } = usePresets(settings, chat);
  useEffect(() => {
    if (!space) {
      setChat(undefined);
      return;
    }
    let cancelled = false;
    void invokePromise(AssistantOperation.CreateChat, {}, { spaceId: space.db.spaceId }).then((result) => {
      if (!cancelled) {
        setChat(result.data?.object);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [space, nonce, invokePromise]);

  const chatModel = useChatModel({ db: space?.db, chat, preset, runtime, registry });

  const event = useMemo(() => new Event<ChatEvent>(), []);
  useEffect(() => {
    return event.on((ev) => {
      if (ev.type !== 'submit') {
        return;
      }
      const text = ev.text.trim();
      if (!space || !chat || text.length === 0) {
        return;
      }

      // Persist the in-memory chat, queue the prompt, and open the chat (which submits it).
      space.db.add(chat);
      const chatPath = getChatPath(space.db.spaceId, chat.id);
      atomRegistry.update(stateAtom, (current) => ({
        ...current,
        pendingPrompts: { ...current.pendingPrompts, [chatPath]: text },
      }));
      void invokePromise(LayoutOperation.Open, { subject: [chatPath] });
      setNonce((current) => current + 1);
    });
  }, [event, space, chat, atomRegistry, stateAtom, invokePromise]);

  if (!chatModel || !chat || !space) {
    return null;
  }

  return (
    <ChatPrompt
      {...presetProps}
      outline
      chat={chat}
      db={space.db}
      chatModel={chatModel}
      event={event}
      preset={preset?.id}
      placeholder={t('space-home.prompt.placeholder')}
    />
  );
};

SpaceHomePrompt.displayName = 'SpaceHomePrompt';
