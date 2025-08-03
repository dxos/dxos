//
// Copyright 2025 DXOS.org
//

import { type Layer } from 'effect';
import { useEffect, useMemo, useState } from 'react';

import { type ExecutableTool } from '@dxos/ai';
import { Capabilities, useCapabilities, useIntentDispatcher } from '@dxos/app-framework';
import { AiConversation, createSystemPrompt } from '@dxos/assistant';
import { type ArtifactDefinition, type AssociatedArtifact, type Blueprint } from '@dxos/blueprints';
import { FunctionType } from '@dxos/functions';
import { log } from '@dxos/log';
import { useConfig } from '@dxos/react-client';
import { Filter, type Queue, type Space, fullyQualifiedId, useQuery } from '@dxos/react-client/echo';
import { isNonNullable } from '@dxos/util';

import { type AiServicePreset, ChatProcessor, type ChatServices } from '../hooks';
import { convertFunctionToTool, createToolsFromService } from '../tools';
import { type Assistant, ServiceType } from '../types';

export type UseChatProcessorProps = {
  preset?: AiServicePreset;
  space?: Space;
  chat?: Assistant.Chat;

  // TODO(burdon): Move into layer?
  services?: Layer.Layer<ChatServices>;
  blueprintRegistry?: Blueprint.Registry;
  // TODO(burdon): Not currently used.
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
  preset,
  space,
  chat,
  services,
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
    const extensions = { space, dispatch, pivotId: chatId };
    return [tools, extensions];
  }, [dispatch, globalTools, space, chatId, serviceTools, functions]);

  // TODO(burdon): Create from template.
  const systemPrompt = useMemo(
    () =>
      createSystemPrompt({
        artifacts: artifacts.map((definition) => `${definition.name}\n${definition.instructions}`),
        artifact,
        instructions,
      }),
    [artifacts, artifact, instructions],
  );

  const conversation = useMemo(() => {
    if (!chat?.queue.target) {
      return;
    }

    return new AiConversation({ queue: chat.queue.target as Queue<any> });
  }, [chat?.queue.target]);

  // Create processor.
  // TODO(burdon): Updated on each query update above; should just update current processor?
  const processor = useMemo(() => {
    if (!services || !conversation) {
      return undefined;
    }

    log('creating processor', {
      preset,
      artifacts: artifacts.length,
      systemPrompt: systemPrompt.length,
      model: preset?.model,
      settings,
    });

    return new ChatProcessor(services, conversation, {
      tools,
      extensions,
      blueprintRegistry,
      artifacts,
      systemPrompt,
      model: preset?.model,
    });
  }, [services, conversation, tools, blueprintRegistry, artifacts, extensions, systemPrompt, preset]);

  return processor;
};

// TODO(dmaretskyi): Extract.
export const Stable = Object.freeze({
  array: [] as readonly never[],
  object: {} as {},
});
