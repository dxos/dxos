//
// Copyright 2025 DXOS.org
//

import React from 'react';

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
  const artifact = data.companionTo;

  // Initialize companion chat if it doesn't exist.
  useAsyncEffect(async () => {
    const space = getSpace(artifact);
    const result = await space?.db
      .query(Query.select(Filter.ids(artifact.id)).targetOf(Assistant.CompanionTo).source())
      .run();
    if (result?.objects.length === 0) {
      onChatCreate?.();
    }
  }, [artifact, onChatCreate]);

  // TODO(wittjosiah): Occasionally this fails to bind but seems to be an upstream issue.
  //   It seems like the queue object signal emits as an empty array after previously emitting a non-empty array.
  useAsyncEffect(async () => {
    if (!binder) {
      return;
    }

    if (Obj.instanceOf(Blueprint.Blueprint, artifact)) {
      await binder.bind({ blueprints: [Ref.make(artifact as Blueprint.Blueprint)] });
    } else {
      await binder.bind({ objects: [Ref.make(artifact)] });
    }
  }, [binder, artifact]);

  if (!chat) {
    return null;
  }

  return <ChatContainer role={role} chat={chat} onChatCreate={onChatCreate} />;
};

export default ChatCompanion;
