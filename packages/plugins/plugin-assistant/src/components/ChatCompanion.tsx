//
// Copyright 2025 DXOS.org
//

import React, { useEffect, useRef } from 'react';

import { Blueprint } from '@dxos/blueprints';
import { getSpace } from '@dxos/client/echo';
import { Filter, Obj, Query, Ref } from '@dxos/echo';
import { useAsyncEffect } from '@dxos/react-ui';

import { ChatContainer } from '../components';
import { type AiChatProcessor } from '../hooks';
import { Assistant } from '../types';

export type ChatCompanionProps = {
  role?: string;
  data: { companionTo: Obj.Any; subject: Assistant.Chat | 'assistant-chat' };
  onChatCreate?: () => void;
};

export const ChatCompanion = ({ role, data, onChatCreate }: ChatCompanionProps) => {
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

  const processorRef = useRef<AiChatProcessor>();
  const processor = processorRef.current;
  useEffect(() => {
    if (!processor) {
      return;
    }

    // TODO(burdon): Check if already bound.
    if (Obj.instanceOf(Blueprint.Blueprint, data.companionTo)) {
      void processor.context.bind({ blueprints: [Ref.make(data.companionTo)] });
    } else {
      void processor.context.bind({ objects: [Ref.make(data.companionTo)] });
    }
  }, [processor, data.companionTo]);

  if (data.subject === 'assistant-chat') {
    return null;
  }

  return <ChatContainer ref={processorRef} role={role} chat={data.subject} onChatCreate={onChatCreate} />;
};

export default ChatCompanion;
