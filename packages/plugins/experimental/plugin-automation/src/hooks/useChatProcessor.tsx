//
// Copyright 2025 DXOS.org
//

import { useEffect, useMemo, useState } from 'react';

import { Capabilities, useCapabilities, useCapability, useIntentDispatcher } from '@dxos/app-framework';
import { createSystemPrompt, type Tool } from '@dxos/artifact';
import { FunctionType } from '@dxos/functions';
import { useConfig } from '@dxos/react-client';
import { Filter, getSpace, useQuery } from '@dxos/react-client/echo';
import { isNotNullOrUndefined } from '@dxos/util';

import { AutomationCapabilities } from '../capabilities';
import { ChatProcessor } from '../hooks';
import { covertFunctionToTool, createToolsFromService } from '../tools';
import { ServiceType, type AIChatType } from '../types';

/**
 * Creates a processor for the chat.
 */
export const useChatProcessor = (chat: AIChatType) => {
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
  // useEffect(() => {
  //   if (processor) {
  //     processor.setTools(tools.flat());
  //   }
  // }, [processor, tools]);

  return processor;
};
