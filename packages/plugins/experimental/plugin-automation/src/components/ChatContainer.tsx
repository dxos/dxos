//
// Copyright 2025 DXOS.org
//

import React, { useMemo, useRef, useState } from 'react';

import { useCapability } from '@dxos/app-framework';
import { type Message } from '@dxos/artifact';
import { type ArtifactsContext } from '@dxos/artifact-testing';
import { DXN, QueueSubspaceTags } from '@dxos/keys';
import { create, getSpace } from '@dxos/react-client/echo';
import { useEdgeClient, useQueue } from '@dxos/react-edge-client';
import { StackItem } from '@dxos/react-ui-stack';

import { Thread } from './Thread';
import { AutomationCapabilities } from '../capabilities';
import { ChatProcessor } from '../hooks';
import { type GptChatType } from '../types';

/**
 * A custom hook that ensures a callback reference remains stable while allowing the callback
 * implementation to be updated. This is useful for callbacks that need to access the latest
 * state/props values while maintaining a stable reference to prevent unnecessary re-renders.
 */
// TODO(burdon): Remove.
const useDynamicCallback = <F extends (...args: any[]) => any>(callback: F): F => {
  const ref = useRef<F>(callback);
  ref.current = callback;
  return ((...args) => ref.current(...args)) as F;
};

export const ChatContainer = ({ chat, role }: { chat: GptChatType; role: string }) => {
  const edgeClient = useEdgeClient();
  const aiClient = useCapability(AutomationCapabilities.AiClient);

  // TODO(wittjosiah): Get tools from system.
  const tools = useMemo(() => [], []);

  // TODO(wittjosiah): Get artifacts from system.
  const [artifactsContext] = useState(() =>
    create<ArtifactsContext>({
      items: [],
      getArtifacts() {
        return this.items;
      },
      addArtifact(artifact) {
        this.items.push(artifact);
      },
    }),
  );

  // TODO(burdon): Create hook.
  // TODO(wittjosiah): Should these be created in the component?
  // TODO(zan): Combine with ai service client?
  const processor = useMemo(
    () => new ChatProcessor(aiClient, tools, { artifacts: artifactsContext }),
    [aiClient, tools, artifactsContext],
  );
  // TODO(wittjosiah): Remove transformation.
  const queueDxn = useMemo(
    () => new DXN(DXN.kind.QUEUE, [QueueSubspaceTags.DATA, getSpace(chat)!.id, chat.queue.dxn.parts.at(-1)!]),
    [chat.queue.dxn],
  );
  const queue = useQueue<Message>(edgeClient, queueDxn);
  const messages = useMemo(
    () => [...queue.items, ...processor.messages.value],
    [queue.items, processor.messages.value],
  );

  const handleSubmit = useDynamicCallback(async (message: string) => {
    // TODO(burdon): Button to cancel. Otherwise queue request.
    if (processor.isStreaming) {
      await processor.cancel();
    }

    const messages = await processor.request(message, queue.items);
    // TODO(burdon): Append on success only? If approved by user? Clinet/server.
    await queue.append(messages);
  });

  return (
    <StackItem.Content toolbar={false} role={role}>
      <Thread messages={messages} streaming={processor.isStreaming.value} onSubmit={handleSubmit} />
    </StackItem.Content>
  );
};

export default ChatContainer;
