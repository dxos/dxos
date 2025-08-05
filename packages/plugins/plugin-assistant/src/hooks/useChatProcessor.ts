//
// Copyright 2025 DXOS.org
//

import { RegistryContext } from '@effect-rx/rx-react';
import { type Layer } from 'effect';
import { useContext, useEffect, useMemo, useState } from 'react';

import { type ExecutableTool } from '@dxos/ai';
import { useIntentDispatcher } from '@dxos/app-framework';
import { AiConversation } from '@dxos/assistant';
import { type Blueprint } from '@dxos/blueprints';
import { log } from '@dxos/log';
import { Filter, type Queue, type Space, fullyQualifiedId, useQuery } from '@dxos/react-client/echo';

import { AiChatProcessor, type AiChatServices, type AiServicePreset } from '../hooks';
import { createToolsFromService } from '../tools';
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
  const registry = useContext(RegistryContext);
  const { dispatchPromise: dispatch } = useIntentDispatcher();

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
  const chatId = useMemo(() => (chat ? fullyQualifiedId(chat) : undefined), [chat]);
  const extensions = useMemo(() => ({ space, dispatch, pivotId: chatId }), [dispatch, space, chatId]);

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
      extensions,
      blueprintRegistry,
      registry,
      model: preset?.model,
    });
  }, [services, conversation, blueprintRegistry, extensions, preset]);

  return processor;
};

// TODO(dmaretskyi): Extract.
export const Stable = Object.freeze({
  array: [] as readonly never[],
  object: {} as {},
});
