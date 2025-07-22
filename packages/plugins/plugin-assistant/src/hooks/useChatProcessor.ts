//
// Copyright 2025 DXOS.org
//

import { type Layer } from 'effect';
import { useEffect, useMemo, useState } from 'react';

import { DEFAULT_EDGE_MODEL, DEFAULT_OLLAMA_MODEL, type ExecutableTool } from '@dxos/ai';
import { Capabilities, useCapabilities, useIntentDispatcher } from '@dxos/app-framework';
import { type ArtifactDefinition, type AssociatedArtifact, createSystemPrompt } from '@dxos/artifact';
import { type BlueprintRegistry, Conversation } from '@dxos/assistant';
import { FunctionType } from '@dxos/functions';
import { log } from '@dxos/log';
import { useConfig } from '@dxos/react-client';
import { Filter, fullyQualifiedId, type Queue, type Space, useQuery } from '@dxos/react-client/echo';
import { isNonNullable } from '@dxos/util';

import { ChatProcessor, type ChatServices, type ChatProcessorOptions, type Services } from '../hooks';
import { convertFunctionToTool, createToolsFromService } from '../tools';
import { type Assistant, ServiceType } from '../types';
import type { Layer } from 'effect';

type UseChatProcessorProps = {
  /** @deprecated Why is this required? */
  part?: 'deck' | 'dialog';
  space?: Space;
  chat?: Assistant.Chat;
  serviceLayer?: Layer.Layer<ChatServices>;

  // TODO(burdon): Reconcile all of below (overlapping concepts). Figure out how to inject vie effect layers.
  blueprintRegistry?: BlueprintRegistry;
  settings?: Assistant.Settings;
  /** @deprecated */
  instructions?: string;
  /** @deprecated */
  artifact?: AssociatedArtifact;
  /** @deprecated */
  noPluginArtifacts?: boolean;
};

/**
 * Configure and create ChatProcessor.
 */
export const useChatProcessor = ({
  part = 'deck',
  space,
  chat,
  serviceLayer,
  blueprintRegistry,
  settings,
  instructions,
  artifact,
  noPluginArtifacts,
}: UseChatProcessorProps): ChatProcessor | undefined => {
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const globalTools = useCapabilities(Capabilities.Tools);

  // TODO(burdon): Spec artifacts.
  let artifacts: readonly ArtifactDefinition[] = useCapabilities(Capabilities.ArtifactDefinition);
  if (noPluginArtifacts) {
    artifacts = Stable.array;
  }

  // Services.
  const remoteServices = useQuery(space, Filter.type(ServiceType));
  const [serviceTools, setServiceTools] = useState<ExecutableTool[]>([]);
  useEffect(() => {
    log('creating service tools...');
    queueMicrotask(async () => {
      const tools = await Promise.all(remoteServices.map((service) => createToolsFromService(service)));
      setServiceTools(tools.flat());
    });
  }, [remoteServices]);

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
        artifacts: artifacts.map((definition) => `${definition.name}\n${definition.instructions}`),
        artifact,
        instructions,
      }),
    [artifacts, artifact, instructions],
  );

  // TODO(burdon): Remove default (let backend decide if not specified).
  const model: ChatProcessorOptions['model'] =
    settings?.llmProvider === 'ollama'
      ? ((settings?.ollamaModel ?? DEFAULT_OLLAMA_MODEL) as ChatProcessorOptions['model'])
      : ((settings?.edgeModel ?? DEFAULT_EDGE_MODEL) as ChatProcessorOptions['model']);

  const conversation = useMemo(() => {
    if (!chat?.queue.target) {
      return;
    }

    return new Conversation({
      queue: chat.queue.target as Queue<any>,
    });
  }, [chat?.queue.target]);

  // Create processor.
  // TODO(burdon): Updated on each query update above; should just update current processor.
  const processor = useMemo(() => {
    if (!serviceLayer || !conversation) {
      return undefined;
    }

    log('creating processor...', { settings });
    return new ChatProcessor(serviceLayer, conversation, {
      tools,
      extensions,
      blueprintRegistry,
      artifacts,
      systemPrompt,
      model,
    });
  }, [serviceLayer, conversation, tools, blueprintRegistry, artifacts, extensions, systemPrompt, model]);

  return processor;
};

// TODO(dmaretskyi): Extract.
export const Stable = Object.freeze({
  array: [] as readonly never[],
  object: {} as {},
});
