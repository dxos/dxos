//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { Capabilities, useCapabilities, useCapability, useIntentDispatcher } from '@dxos/app-framework';
import { createSystemPrompt, type Message } from '@dxos/artifact';
import { DXN, QueueSubspaceTags } from '@dxos/keys';
import { getSpace } from '@dxos/react-client/echo';
import { useEdgeClient, useQueue } from '@dxos/react-edge-client';
import { StackItem } from '@dxos/react-ui-stack';

import { Thread } from './Thread';
import { AutomationCapabilities } from '../capabilities';
import { ChatProcessor } from '../hooks';
import { type GptChatType } from '../types';

export const ChatContainer = ({ chat, role }: { chat: GptChatType; role: string }) => {
  const edgeClient = useEdgeClient();
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const space = getSpace(chat);
  const aiClient = useCapability(AutomationCapabilities.AiClient);
  const artifactDefinitions = useCapabilities(Capabilities.ArtifactDefinition);
  const globalTools = useCapabilities(Capabilities.Tools);
  const tools = useMemo(
    () => [...globalTools.flat(), ...artifactDefinitions.flatMap((definition) => definition.tools)],
    [globalTools, artifactDefinitions],
  );
  const systemPrompt = useMemo(
    () => createSystemPrompt({ artifacts: artifactDefinitions.map((definition) => definition.instructions) }),
    [artifactDefinitions],
  );

  // TODO(burdon): Create hook.
  // TODO(wittjosiah): Should these be created in the component?
  // TODO(zan): Combine with ai service client?
  const processor = useMemo(
    () =>
      new ChatProcessor(
        aiClient,
        tools,
        {
          space,
          dispatch,
        },
        {
          model: '@anthropic/claude-3-5-sonnet-20241022',
          systemPrompt,
        },
      ),
    [aiClient, tools, space, systemPrompt],
  );
  // TODO(wittjosiah): Remove transformation.
  const queueDxn = useMemo(
    () => new DXN(DXN.kind.QUEUE, [QueueSubspaceTags.DATA, space!.id, chat.queue.dxn.parts.at(-1)!]),
    [chat.queue.dxn],
  );
  const queue = useQueue<Message>(edgeClient, queueDxn);
  const messages = [...queue.items, ...processor.messages.value];

  const handleSubmit = useCallback(
    async (message: string) => {
      // TODO(burdon): Button to cancel. Otherwise queue request.
      if (processor.isStreaming) {
        await processor.cancel();
      }

      // TODO(burdon): Append on success only? If approved by user? Clinet/server.
      const messages = await processor.request(message, queue.items);
      queue.append(messages);
    },
    [processor, queue],
  );

  return (
    <StackItem.Content toolbar={false} role={role}>
      <Thread messages={messages} streaming={processor.isStreaming} onSubmit={handleSubmit} />
    </StackItem.Content>
  );
};

export default ChatContainer;
