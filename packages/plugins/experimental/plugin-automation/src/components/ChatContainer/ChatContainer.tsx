//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { Capabilities, useCapabilities, useCapability, useIntentDispatcher } from '@dxos/app-framework';
import { createSystemPrompt, type Message, type Tool } from '@dxos/artifact';
import { FunctionType } from '@dxos/functions';
import { invariant } from '@dxos/invariant';
import { DXN, QueueSubspaceTags } from '@dxos/keys';
import { useConfig } from '@dxos/react-client';
import { Filter, getSpace, useQuery } from '@dxos/react-client/echo';
import { useEdgeClient, useQueue } from '@dxos/react-edge-client';
import { StackItem } from '@dxos/react-ui-stack';
import { isNotNullOrUndefined } from '@dxos/util';

import { AutomationCapabilities } from '../../capabilities';
import { ChatProcessor } from '../../hooks';
import { covertFunctionToTool, createToolsFromService } from '../../tools';
import { ServiceType, type AIChatType } from '../../types';
import { Thread } from '../Thread';

// TOOD(burdon): Factor out?
const useChatProcessor = (chat: AIChatType) => {
  const aiClient = useCapability(AutomationCapabilities.AiClient);
  const globalTools = useCapabilities(Capabilities.Tools);
  const artifactDefinitions = useCapabilities(Capabilities.ArtifactDefinition);
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const space = getSpace(chat);

  // Services.
  const services = useQuery(space, Filter.schema(ServiceType));
  const [serviceTools, setServiceTools] = useState<Tool[]>([]);
  useEffect(() => {
    queueMicrotask(async () => {
      const tools = await Promise.all(services.map((service) => createToolsFromService(service)));
      setServiceTools(tools.flat());
    });
  }, [services]);

  // Tools.
  const config = useConfig();
  const functions = useQuery(space, Filter.schema(FunctionType));
  const tools = useMemo(
    () => [
      ...globalTools.flat(),
      ...artifactDefinitions.flatMap((definition) => definition.tools),
      ...serviceTools,
      ...functions
        .map((fn) => covertFunctionToTool(fn, config.values.runtime?.services?.edge?.url ?? '', space?.id))
        .filter(isNotNullOrUndefined),
    ],
    [globalTools, artifactDefinitions, serviceTools, functions, space?.id],
  );

  // Prompt.
  const systemPrompt = useMemo(
    () => createSystemPrompt({ artifacts: artifactDefinitions.map((definition) => definition.instructions) }),
    [artifactDefinitions],
  );

  // Create processor.
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
    [aiClient, tools, space, dispatch, systemPrompt],
  );

  // Update processor.
  useEffect(() => {
    if (processor) {
      processor.setTools(tools.flat());
    }
  }, [processor, tools]);

  return processor;
};

// TOOD(burdon): Factor out?
const useMessageQueue = (chat: AIChatType) => {
  const edgeClient = useEdgeClient();
  const space = getSpace(chat);
  const queueDxn = useMemo(
    () => new DXN(DXN.kind.QUEUE, [QueueSubspaceTags.DATA, space!.id, chat.queue.dxn.parts.at(-1)!]),
    [chat.queue.dxn],
  );

  return useQueue<Message>(edgeClient, queueDxn);
};

export const ChatContainer = ({ chat, role }: { chat: AIChatType; role: string }) => {
  const processor = useChatProcessor(chat);
  const messageQueue = useMessageQueue(chat);
  const messages = [...(messageQueue?.items ?? []), ...processor.messages.value];

  const handleSubmit = useCallback(
    async (message: string) => {
      if (processor.streaming.value) {
        await processor.cancel();
      }

      invariant(messageQueue);
      await processor.request(message, {
        history: messageQueue.items,
        onComplete: (messages) => messageQueue.append(messages),
      });
    },
    [processor, messageQueue],
  );

  const handleStop = useCallback(() => {
    if (processor.streaming.value) {
      void processor.cancel();
    }
  }, [processor]);

  return (
    <StackItem.Content toolbar={false} role={role}>
      <Thread messages={messages} streaming={processor.streaming.value} onSubmit={handleSubmit} onStop={handleStop} />
    </StackItem.Content>
  );
};

export default ChatContainer;
