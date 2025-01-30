import React, { useMemo, useState } from 'react';

//
// Copyright 2025 DXOS.org
//

import { AIServiceClientImpl, type Message } from '@dxos/assistant';
import { EdgeHttpClient } from '@dxos/edge-client';
import { invariant } from '@dxos/invariant';
import { DXN, QueueSubspaceTags } from '@dxos/keys';
import { useConfig } from '@dxos/react-client';
import { create, getSpace } from '@dxos/react-client/echo';
import { useDynamicCallback, useQueue } from '@dxos/react-ui-canvas-compute';
import { type ArtifactsContext } from '@dxos/react-ui-canvas-compute/testing';
import { StackItem } from '@dxos/react-ui-stack';

import { Thread } from './Thread';
import { ChatProcessor } from '../hooks';
import { type GptChatType } from '../types';

export const ChatContainer = ({ chat, role }: { chat: GptChatType; role: string }) => {
  const config = useConfig();
  const edgeUrl = config.values.runtime?.services?.edge?.url;
  invariant(edgeUrl, 'EDGE services not configured.');
  // TODO(wittjosiah): These should not be defined here.
  //   EdgeHttpClient should be available via the client.
  //   AIServiceClientImpl should be available via a capability.
  const [edgeHttpClient] = useState(() => new EdgeHttpClient(edgeUrl));
  const [aiClient] = useState(() => new AIServiceClientImpl({ endpoint: 'http://localhost:8788' }));

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
  const [processor] = useState(() => new ChatProcessor(aiClient, tools, { artifacts: artifactsContext }));
  // TODO(wittjosiah): Remove transformation.
  const queueDxn = useMemo(
    () => new DXN(DXN.kind.QUEUE, [QueueSubspaceTags.DATA, getSpace(chat)!.id, chat.queue.dxn.parts.at(-1)!]),
    [chat.queue.dxn],
  );
  const queue = useQueue<Message>(edgeHttpClient, queueDxn);
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
