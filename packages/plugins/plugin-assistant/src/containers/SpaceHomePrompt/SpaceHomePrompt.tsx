//
// Copyright 2026 DXOS.org
//

import React, { useEffect, useMemo, useState } from 'react';

import { Capabilities } from '@dxos/app-framework';
import { useCapability, useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { Event } from '@dxos/async';
import { type Space, useRegistry } from '@dxos/react-client/echo';
import { useTranslation } from '@dxos/react-ui';

import { ChatPrompt, type ChatEvent } from '#components';
import { useChatProcessor, useChatServices, useOnline, usePresets } from '#hooks';
import { meta } from '#meta';
import { AssistantCapabilities, AssistantOperation, type ChatType } from '#types';

import { getChatPath } from '../../paths';

type SpaceScopedProps = {
  space?: Space;
};

/**
 * Home article pinned-bottom contributor: the assistant prompt. Backed by an ephemeral in-memory
 * chat whose sole responsibility is to collect the user's text, context bindings, and preset
 * choice, then on submit: persist the chat to the space, queue the text as a pending prompt, and
 * navigate to it. AI generation runs in the opened chat view — the processor here exists only to
 * back the context-binder UI.
 */
export const SpaceHomePrompt = ({ space }: SpaceScopedProps) => {
  const { t } = useTranslation(meta.id);
  const { invokePromise } = useOperationInvoker();

  const registry = useRegistry();
  const atomRegistry = useCapability(Capabilities.AtomRegistry);
  const stateAtom = useCapability(AssistantCapabilities.State);
  const runtime = useChatServices({ id: space?.id });
  const [online, setOnline] = useOnline();
  const { preset, ...presetProps } = usePresets(online);

  // In-memory backing chat (not yet added to the space). `nonce` forces a fresh chat after submit.
  const [chat, setChat] = useState<ChatType.Chat>();
  const [nonce, setNonce] = useState(0);
  useEffect(() => {
    if (!space) {
      setChat(undefined);
      return;
    }
    let cancelled = false;
    void invokePromise(AssistantOperation.CreateChat, { db: space.db, addToSpace: false }).then((result) => {
      if (!cancelled) {
        setChat(result.data?.object);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [space, nonce, invokePromise]);

  const processor = useChatProcessor({ space, chat, preset, runtime, registry });

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

  if (!processor || !chat || !space) {
    return null;
  }

  return (
    <ChatPrompt
      {...presetProps}
      outline
      chat={chat}
      db={space.db}
      processor={processor}
      event={event}
      preset={preset?.id}
      online={online}
      onOnlineChange={setOnline}
      placeholder={t('space-home.prompt.placeholder')}
    />
  );
};
