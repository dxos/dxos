//
// Copyright 2025 DXOS.org
//

import { RegistryContext } from '@effect-rx/rx-react';
import type * as Runtime from 'effect/Runtime';
import { useContext, useEffect, useMemo, useState } from 'react';

import { AiConversation } from '@dxos/assistant';
import { type Blueprint } from '@dxos/blueprints';
import { log } from '@dxos/log';
import { type Queue } from '@dxos/react-client/echo';

import { AiChatProcessor, type AiChatServices, type AiServicePreset } from '../processor';
import { type Assistant } from '../types';

export type UseChatProcessorProps = {
  chat?: Assistant.Chat;
  preset?: AiServicePreset;
  services?: () => Promise<Runtime.Runtime<AiChatServices>>;
  blueprintRegistry?: Blueprint.Registry;
  settings?: Assistant.Settings;
};

/**
 * Configure and create AiChatProcessor.
 */
export const useChatProcessor = ({
  chat,
  preset,
  services,
  blueprintRegistry,
  settings,
}: UseChatProcessorProps): AiChatProcessor | undefined => {
  const observableRegistry = useContext(RegistryContext);

  // Create conversation from chat queue.
  const [conversation, setConversation] = useState<AiConversation>();
  useEffect(() => {
    if (!chat?.queue.target) {
      return;
    }

    const conversation = new AiConversation({ queue: chat.queue.target as Queue<any> });
    conversation.open();
    setConversation(conversation);

    return () => conversation.close();
  }, [chat?.queue.target]);

  // Create processor.
  const processor = useMemo(() => {
    if (!services || !conversation) {
      return undefined;
    }

    log('creating processor', {
      preset,
      model: preset?.model,
      settings,
    });

    return new AiChatProcessor(conversation, services, {
      observableRegistry,
      blueprintRegistry,
      model: preset?.model,
    });
  }, [services, conversation, blueprintRegistry, preset]);

  return processor;
};
