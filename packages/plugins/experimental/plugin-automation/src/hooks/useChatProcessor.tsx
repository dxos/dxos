//
// Copyright 2025 DXOS.org
//

import { useEffect, useMemo, useState } from 'react';

import { Capabilities, useCapabilities, useCapability, useIntentDispatcher } from '@dxos/app-framework';
import { createSystemPrompt, type Tool } from '@dxos/artifact';
import { FunctionType } from '@dxos/functions';
import { log } from '@dxos/log';
import { useConfig } from '@dxos/react-client';
import { Filter, type Space, useQuery } from '@dxos/react-client/echo';
import { isNonNullable } from '@dxos/util';

import { AutomationCapabilities } from '../capabilities';
import { ChatProcessor } from '../hooks';
import { covertFunctionToTool, createToolsFromService } from '../tools';
import { ServiceType } from '../types';

/**
 * Creates a processor for the chat.
 */
export const useChatProcessor = (space?: Space): ChatProcessor => {
  const aiClient = useCapability(AutomationCapabilities.AiClient);
  const globalTools = useCapabilities(Capabilities.Tools);
  const artifactDefinitions = useCapabilities(Capabilities.ArtifactDefinition);
  const { dispatchPromise: dispatch } = useIntentDispatcher();

  // Services.
  const services = useQuery(space, Filter.schema(ServiceType));
  const [serviceTools, setServiceTools] = useState<Tool[]>([]);
  useEffect(() => {
    log('creating service tools...');
    queueMicrotask(async () => {
      const tools = await Promise.all(services.map((service) => createToolsFromService(service)));
      setServiceTools(tools.flat());
    });
  }, [services]);

  // Tools and context.
  const config = useConfig();
  const functions = useQuery(space, Filter.schema(FunctionType));
  const [tools, extensions] = useMemo(() => {
    log('creating tools...');
    const tools = [
      ...globalTools.flat(),
      ...artifactDefinitions.flatMap((definition) => definition.tools),
      ...serviceTools,
      ...functions
        .map((fn) => covertFunctionToTool(fn, config.values.runtime?.services?.edge?.url ?? '', space?.id))
        .filter(isNonNullable),
    ];
    const extensions = { space, dispatch };
    return [tools, extensions];
  }, [dispatch, globalTools, artifactDefinitions, space, serviceTools, functions]);

  // Prompt.
  const systemPrompt = useMemo(
    () => createSystemPrompt({ artifacts: artifactDefinitions.map((definition) => definition.instructions) }),
    [artifactDefinitions],
  );

  // Create processor.
  // TODO(burdon): Updated on each query update above. Should just update current processor.
  const processor = useMemo(() => {
    log.info('creating processor...');
    return new ChatProcessor(aiClient, tools, extensions, {
      // TODO(burdon): Move to settings.
      model: '@anthropic/claude-3-5-sonnet-20241022',
      systemPrompt,
    });
  }, [aiClient, tools, extensions, systemPrompt]);

  return processor;
};
