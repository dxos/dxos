//
// Copyright 2025 DXOS.org
//

import { type Layer } from 'effect';
import { useEffect, useMemo, useState } from 'react';

import { type ExecutableTool } from '@dxos/ai';
import { Capabilities, useCapabilities, useIntentDispatcher } from '@dxos/app-framework';
import { AiConversation } from '@dxos/assistant';
import { type Blueprint } from '@dxos/blueprints';
import { FunctionType } from '@dxos/functions';
import { log } from '@dxos/log';
import { useConfig } from '@dxos/react-client';
import { Filter, type Queue, type Space, fullyQualifiedId, useQuery } from '@dxos/react-client/echo';
import { isNonNullable } from '@dxos/util';

import { AiChatProcessor, type AiChatServices, type AiServicePreset } from '../hooks';
import { convertFunctionToTool, createToolsFromService } from '../tools';
import { type Assistant, ServiceType } from '../types';

export type UseChatProcessorProps = {
  space?: Space;
  chat?: Assistant.Chat;
  preset?: AiServicePreset;
  services?: Layer.Layer<AiChatServices>;
  blueprintRegistry?: Blueprint.Registry;
  settings?: Assistant.Settings;
};

/**
 * Configure and create AiChatProcessor.
 */
export const useChatProcessor = ({
  space,
  chat,
  preset,
  services,
  blueprintRegistry,
  settings,
}: UseChatProcessorProps): AiChatProcessor | undefined => {
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const globalTools = useCapabilities(Capabilities.Tools);

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
  const chatId = useMemo(() => (chat ? fullyQualifiedId(chat) : undefined), [chat]);
  const functions = useQuery(space, Filter.type(FunctionType));
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
      model: preset?.model,
      settings,
    });

    return new AiChatProcessor(services, conversation, {
      tools,
      extensions,
      blueprintRegistry,
      model: preset?.model,
    });
  }, [services, conversation, tools, blueprintRegistry, extensions, preset]);

  return processor;
};

// TODO(dmaretskyi): Extract.
export const Stable = Object.freeze({
  array: [] as readonly never[],
  object: {} as {},
});
