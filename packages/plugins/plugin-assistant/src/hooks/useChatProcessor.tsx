//
// Copyright 2025 DXOS.org
//

import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  Capabilities,
  CollaborationActions,
  createIntent,
  useCapabilities,
  useCapability,
  useIntentDispatcher,
} from '@dxos/app-framework';
import { type AssociatedArtifact, createSystemPrompt, type Tool } from '@dxos/artifact';
import { DEFAULT_EDGE_MODEL, DEFAULT_OLLAMA_MODEL } from '@dxos/assistant';
import { FunctionType } from '@dxos/functions/types';
import { log } from '@dxos/log';
import { useConfig } from '@dxos/react-client';
import { Filter, fullyQualifiedId, type Space, useQuery } from '@dxos/react-client/echo';
import { isNonNullable } from '@dxos/util';

import { AssistantCapabilities } from '../capabilities';
import { ChatProcessor, type ChatProcessorOptions } from '../hooks';
import { covertFunctionToTool, createToolsFromService } from '../tools';
import { type AIChatType, type AssistantSettingsProps, ServiceType } from '../types';

type UseChatProcessorProps = {
  chat?: AIChatType;
  space?: Space;
  settings?: AssistantSettingsProps;
  part?: 'deck' | 'dialog';
  associatedArtifact?: AssociatedArtifact;
};

/**
 * Configure and create ChatProcessor.
 */
export const useChatProcessor = ({
  chat,
  space,
  settings,
  part = 'deck',
  associatedArtifact,
}: UseChatProcessorProps): ChatProcessor => {
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
  const chatId = useMemo(() => (chat ? fullyQualifiedId(chat) : undefined), [chat]);
  const [tools, extensions] = useMemo(() => {
    log('creating tools...');
    const tools = [
      ...globalTools.flat(),
      ...serviceTools,
      ...functions
        .map((fn) => covertFunctionToTool(fn, config.values.runtime?.services?.edge?.url ?? '', space?.id))
        .filter(isNonNullable),
    ];
    const extensions = { space, dispatch, pivotId: chatId, part };
    return [tools, extensions];
  }, [dispatch, globalTools, space, chatId, serviceTools, functions]);

  // Prompt.
  const systemPrompt = useMemo(
    () =>
      createSystemPrompt({
        artifacts: artifactDefinitions.map((definition) => `${definition.name}\n${definition.instructions}`),
        associatedArtifact,
      }),
    [artifactDefinitions, associatedArtifact],
  );

  // TODO(burdon): Remove default (let backend decide if not specified).
  const model: ChatProcessorOptions['model'] =
    settings?.llmProvider === 'ollama'
      ? ((settings?.ollamaModel ?? DEFAULT_OLLAMA_MODEL) as ChatProcessorOptions['model'])
      : ((settings?.edgeModel ?? DEFAULT_EDGE_MODEL) as ChatProcessorOptions['model']);

  // Create a callback for processing proposals
  const onProposalProcessed = useCallback(
    (messageId: string) => {
      console.log('[use chat processor]', 'dispatching proposal intent');
      if (chat && dispatch && associatedArtifact) {
        void dispatch(
          createIntent(CollaborationActions.ContentProposal, {
            dxn: chat.assistantChatQueue.dxn.toString(),
            messageId,
            associatedArtifact,
          }),
        );
      }
    },
    [dispatch, associatedArtifact],
  );

  // Create processor.
  // TODO(burdon): Updated on each query update above; should just update current processor.
  const processor = useMemo(() => {
    log('creating processor...', { settings });
    return new ChatProcessor(
      aiClient.value,
      tools,
      artifactDefinitions,
      extensions,
      { model, systemPrompt },
      onProposalProcessed,
    );
  }, [aiClient.value, tools, artifactDefinitions, extensions, model, systemPrompt, onProposalProcessed]);

  return processor;
};
