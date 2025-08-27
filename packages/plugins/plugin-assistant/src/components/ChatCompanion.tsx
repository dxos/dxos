//
// Copyright 2025 DXOS.org
//

import React, { useEffect } from 'react';

import { Blueprint } from '@dxos/blueprints';
import { getSpace } from '@dxos/client/echo';
import { Filter, Obj, Query, Ref } from '@dxos/echo';
import { useAsyncEffect } from '@dxos/react-ui';

import { ChatContainer } from '../components';
import { useContextBinder } from '../hooks';
import { Assistant } from '../types';

export type ChatCompanionProps = {
  role?: string;
  data: { companionTo: Obj.Any; subject: Assistant.Chat | 'assistant-chat' };
  onChatCreate?: () => void;
};

export const ChatCompanion = ({ role, data, onChatCreate }: ChatCompanionProps) => {
  const chat = data.subject === 'assistant-chat' ? undefined : data.subject;
  const binder = useContextBinder(chat);

  // Initialize companion chat if it doesn't exist.
  useAsyncEffect(async () => {
    const space = getSpace(data.companionTo);
    const result = await space?.db
      .query(Query.select(Filter.ids(data.companionTo.id)).targetOf(Assistant.CompanionTo).source())
      .run();
    if (result?.objects.length === 0) {
      onChatCreate?.();
    }
  }, [data.companionTo]);

  useEffect(() => {
    if (!binder) {
      return;
    }

    const isBlueprint = Obj.instanceOf(Blueprint.Blueprint, data.companionTo);
    const exists = isBlueprint
      ? !!binder.blueprints.peek().find((ref) => ref.dxn.toString() === Obj.getDXN(data.companionTo).toString())
      : !!binder.objects.peek().find((ref) => ref.dxn.toString() === Obj.getDXN(data.companionTo).toString());
    if (exists) {
      return;
    }

    if (isBlueprint) {
      void binder.bind({ blueprints: [Ref.make(data.companionTo as Blueprint.Blueprint)] });
    } else {
      void binder.bind({ objects: [Ref.make(data.companionTo)] });
    }
  }, [binder, data.companionTo]);

  if (!chat) {
    return null;
  }

  return <ChatContainer role={role} chat={chat} onChatCreate={onChatCreate} />;
};

export default ChatCompanion;
