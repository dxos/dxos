//
// Copyright 2025 DXOS.org
//

import { useEffect, useMemo, useState } from 'react';

import { Capabilities, useCapabilities, useCapability, useIntentDispatcher } from '@dxos/app-framework';
import { createSystemPrompt, type Tool } from '@dxos/artifact';
import { DEFAULT_LLM_MODEL } from '@dxos/assistant';
import { FunctionType } from '@dxos/functions/types';
import { log } from '@dxos/log';
import { useConfig } from '@dxos/react-client';
import { Filter, type Space, useQuery } from '@dxos/react-client/echo';
import { isNonNullable } from '@dxos/util';

import { AssistantCapabilities } from '../capabilities';
import { ChatProcessor } from '../hooks';
import { covertFunctionToTool, createToolsFromService } from '../tools';
import { type AssistantSettingsProps, ServiceType } from '../types';

/**
 * Configure and create ChatProcessor.
 */
export const useChatProcessor = (space?: Space, settings?: AssistantSettingsProps): ChatProcessor => {
  const aiClient = useCapability(AssistantCapabilities.AiClient);
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
    () =>
      createSystemPrompt({
        artifacts: artifactDefinitions.map((definition) => definition.instructions),
      }),
    [artifactDefinitions],
  );

  // Create processor.
  // TODO(burdon): Updated on each query update above. Should just update current processor.
  const processor = useMemo(() => {
    log('creating processor...', { settings });
    return new ChatProcessor(aiClient, tools, extensions, {
      // TODO(burdon): Remove defualt (let backend decide if not specified).
      model: settings?.llmModel ?? DEFAULT_LLM_MODEL,
      // TOOD(burdon): Query.
      systemPrompt,
    });
  }, [aiClient, tools, extensions, systemPrompt, settings?.llmModel]);

  return processor;
};
