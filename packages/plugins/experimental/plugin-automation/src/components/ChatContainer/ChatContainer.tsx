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
import { MockServiceRegistry, type AIChatType } from '../../types';
import { Thread } from '../Thread';

export const ChatContainer = ({ chat, role }: { chat: AIChatType; role: string }) => {
  const config = useConfig();
  const space = getSpace(chat);
  const aiClient = useCapability(AutomationCapabilities.AiClient);

  const artifactDefinitions = useCapabilities(Capabilities.ArtifactDefinition);
  const globalTools = useCapabilities(Capabilities.Tools);
  const functions = useQuery(space, Filter.schema(FunctionType));
  const serviceRegistry = useMemo(() => new MockServiceRegistry(), []);

  const [serviceTools, setServiceTools] = useState<Tool[]>([]);
  useEffect(() => {
    queueMicrotask(async () => {
      const services = await serviceRegistry.queryServices({});
      const tools = await Promise.all(services.map((service) => createToolsFromService(service)));
      setServiceTools(tools.flat());
    });
  }, []);

  const tools = useMemo(
    () => [
      ...globalTools.flat(),
      ...artifactDefinitions.flatMap((definition) => definition.tools),
      ...functions
        .map((fn) => covertFunctionToTool(fn, config.values.runtime?.services?.edge?.url ?? '', space?.id))
        .filter(isNotNullOrUndefined),
      ...serviceTools,
    ],
    [globalTools, artifactDefinitions, functions, serviceTools, space?.id],
  );
  const systemPrompt = useMemo(
    () => createSystemPrompt({ artifacts: artifactDefinitions.map((definition) => definition.instructions) }),
    [artifactDefinitions],
  );

  // TODO(burdon): Create hook.
  // TODO(wittjosiah): Should these be created in the component?
  // TODO(zan): Combine with ai service client?
  const { dispatchPromise: dispatch } = useIntentDispatcher();
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

  // TODO(wittjosiah): Remove transformation.
  const queueDxn = useMemo(
    () => new DXN(DXN.kind.QUEUE, [QueueSubspaceTags.DATA, space!.id, chat.queue.dxn.parts.at(-1)!]),
    [chat.queue.dxn],
  );
  const edgeClient = useEdgeClient();
  const messageQueue = useQueue<Message>(edgeClient, queueDxn);
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
