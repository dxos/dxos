//
// Copyright 2025 DXOS.org
//

import { useEffect, useMemo, useState } from 'react';

import { DEFAULT_EDGE_MODEL, DEFAULT_OLLAMA_MODEL, type ExecutableTool } from '@dxos/ai';
import { Capabilities, useCapabilities, useIntentDispatcher } from '@dxos/app-framework';
import { type ArtifactDefinition, type AssociatedArtifact, createSystemPrompt } from '@dxos/artifact';
import { type BlueprintRegistry, Conversation } from '@dxos/assistant';
import { FunctionType, type ServiceContainer } from '@dxos/functions';
import { log } from '@dxos/log';
import { useConfig } from '@dxos/react-client';
import { Filter, fullyQualifiedId, type Queue, type Space, useQuery } from '@dxos/react-client/echo';
import { isNonNullable } from '@dxos/util';

import { ChatProcessor, type ChatProcessorOptions } from '../hooks';
import { convertFunctionToTool, createToolsFromService } from '../tools';
import { type AIChatType, type AssistantSettingsProps, ServiceType } from '../types';

type UseChatProcessorProps = {
  part?: 'deck' | 'dialog';
<<<<<<< HEAD
  space?: Space;
  chat?: AIChatType;
  // TODO(burdon): Reconcile all of below (overlapping concepts). Figure out how to inject vie effect layers.
  serviceContainer: ServiceContainer;
  blueprintRegistry?: BlueprintRegistry;
  settings?: AssistantSettingsProps;
  /** @deprecated */
  artifact?: AssociatedArtifact;
  /** @deprecated */
  noPluginArtifacts?: boolean;
||||||| d7f239a172
  associatedArtifact?: AssociatedArtifact;
=======
  space?: Space;
  chat?: AIChatType;
  // TODO(burdon): Reconcile all of below (overlapping concepts). Figure out how to inject.
  serviceContainer: ServiceContainer;
  blueprintRegistry?: BlueprintRegistry;
  settings?: AssistantSettingsProps;
  /** @deprecated */
  artifact?: AssociatedArtifact;
  /** @deprecated */
  noPluginArtifacts?: boolean;

  /**
   * Additional instructions to included in the system prompt.
   */
  instructions?: string;
>>>>>>> origin/main
};

/**
 * Configure and create ChatProcessor.
 */
export const useChatProcessor = ({
  part,
<<<<<<< HEAD
  space,
  chat,
  serviceContainer,
  blueprintRegistry,
  settings,
  artifact,
  noPluginArtifacts,
}: UseChatProcessorProps): ChatProcessor | undefined => {
||||||| d7f239a172
  associatedArtifact,
}: UseChatProcessorProps): ChatProcessor => {
  const aiClient = useCapability(AssistantCapabilities.AiClient);
  const globalTools = useCapabilities(Capabilities.Tools);
  const artifactDefinitions = useCapabilities(Capabilities.ArtifactDefinition);
=======
  space,
  chat,
  serviceContainer,
  blueprintRegistry,
  settings,
  artifact,
  noPluginArtifacts,
  instructions,
}: UseChatProcessorProps): ChatProcessor | undefined => {
>>>>>>> origin/main
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const globalTools = useCapabilities(Capabilities.Tools);

  // TODO(burdon): Spec artifacts.
  let artifactDefinitions: readonly ArtifactDefinition[] = useCapabilities(Capabilities.ArtifactDefinition);
  if (noPluginArtifacts) {
    artifactDefinitions = Stable.array;
  }

  // Services.
  const services = useQuery(space, Filter.type(ServiceType));
  const [serviceTools, setServiceTools] = useState<ExecutableTool[]>([]);
  useEffect(() => {
    log('creating service tools...');
    queueMicrotask(async () => {
      const tools = await Promise.all(services.map((service) => createToolsFromService(service)));
      setServiceTools(tools.flat());
    });
  }, [services]);

  // Tools and context.
  const config = useConfig();
  const functions = useQuery(space, Filter.type(FunctionType));
  const chatId = useMemo(() => (chat ? fullyQualifiedId(chat) : undefined), [chat]);
  const [tools, extensions] = useMemo(() => {
    log('creating tools...');
    const tools: ExecutableTool[] = [
      ...globalTools.flat(),
      ...serviceTools,
      ...functions
        .map((fn) => convertFunctionToTool(fn, config.values.runtime?.services?.edge?.url ?? '', space?.id))
        .filter(isNonNullable),
    ];
    const extensions = { part, space, dispatch, pivotId: chatId };
    return [tools, extensions];
  }, [dispatch, globalTools, space, chatId, serviceTools, functions]);

  // Prompt.
  const systemPrompt = useMemo(
    () =>
      createSystemPrompt({
        artifacts: artifactDefinitions.map((definition) => `${definition.name}\n${definition.instructions}`),
<<<<<<< HEAD
        artifact,
||||||| d7f239a172
        associatedArtifact,
=======
        artifact,
        instructions,
>>>>>>> origin/main
      }),
<<<<<<< HEAD
    [artifactDefinitions, artifact],
||||||| d7f239a172
    [artifactDefinitions, associatedArtifact],
=======
    [artifactDefinitions, artifact, instructions],
>>>>>>> origin/main
  );

  // TODO(burdon): Remove default (let backend decide if not specified).
  const model: ChatProcessorOptions['model'] =
    settings?.llmProvider === 'ollama'
      ? ((settings?.ollamaModel ?? DEFAULT_OLLAMA_MODEL) as ChatProcessorOptions['model'])
      : ((settings?.edgeModel ?? DEFAULT_EDGE_MODEL) as ChatProcessorOptions['model']);

  const conversation = useMemo(
    () =>
      chat?.queue.target &&
      new Conversation({
        serviceContainer,
        queue: chat.queue.target as Queue<any>,
      }),
    [chat?.queue.target, serviceContainer],
  );

  // Create processor.
  // TODO(burdon): Updated on each query update above; should just update current processor.
  const processor = useMemo(() => {
    log('creating processor...', { settings });
    return (
      conversation &&
      new ChatProcessor(conversation, {
        tools,
        extensions,
        blueprintRegistry,
        artifacts: artifactDefinitions,
        systemPrompt,
        model,
      })
    );
  }, [conversation, tools, blueprintRegistry, artifactDefinitions, extensions, systemPrompt, model]);

  return processor;
};

// TODO(dmaretskyi): Extract.
export const Stable = Object.freeze({
  array: [] as readonly never[],
  object: {} as {},
});
