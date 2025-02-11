//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { Capabilities, useCapabilities, useCapability, useIntentDispatcher } from '@dxos/app-framework';
import { createSystemPrompt, defineTool, ToolResult, type Message, type Tool } from '@dxos/artifact';
import { invariant } from '@dxos/invariant';
import { DXN, QueueSubspaceTags, type SpaceId } from '@dxos/keys';
import { Filter, getMeta, getSpace, useQuery } from '@dxos/react-client/echo';
import { useEdgeClient, useQueue } from '@dxos/react-edge-client';
import { StackItem } from '@dxos/react-ui-stack';

import { Thread } from './Thread';
import { AutomationCapabilities } from '../capabilities';
import { ChatProcessor } from '../hooks';
import { type AIChatType } from '../types';
import { FunctionType, getInvocationUrl, getUserFunctionUrlInMetadata } from '@dxos/functions';
import { isNotNullOrUndefined } from '@dxos/util';
import { toEffectSchema } from '@dxos/echo-schema';
import { useConfig } from '@dxos/react-client';
import { log } from '@dxos/log';

export const ChatContainer = ({ chat, role }: { chat: AIChatType; role: string }) => {
  const config = useConfig();
  const space = getSpace(chat);
  const aiClient = useCapability(AutomationCapabilities.AiClient);

  const artifactDefinitions = useCapabilities(Capabilities.ArtifactDefinition);
  const globalTools = useCapabilities(Capabilities.Tools);
  const functions = useQuery(space, Filter.schema(FunctionType));

  const tools = useMemo(
    () => [
      ...globalTools.flat(),
      ...artifactDefinitions.flatMap((definition) => definition.tools),
      ...functions
        .map((fn) => covertFunctionToTool(fn, config.values.runtime?.services?.edge?.url ?? '', space?.id))
        .filter(isNotNullOrUndefined),
    ],
    [globalTools, artifactDefinitions, functions, space?.id],
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

const covertFunctionToTool = (fn: FunctionType, edgeUrl: string, spaceId?: SpaceId | undefined): Tool | undefined => {
  if (!fn.description || !fn.inputSchema) return undefined;

  const existingFunctionUrl = getUserFunctionUrlInMetadata(getMeta(fn));
  if (!existingFunctionUrl) return undefined;
  const url = getInvocationUrl(existingFunctionUrl, edgeUrl, {
    spaceId: spaceId,
  });

  return defineTool({
    name: fn.name,
    description: fn.description,
    schema: toEffectSchema(fn.inputSchema),
    execute: async (input) => {
      log.info('execute function tool', { name: fn.name, url, input });
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      });
      return ToolResult.Success(await response.text());
    },
  });
};
