//
// Copyright 2025 DXOS.org
//

import { RegistryContext } from '@effect-atom/atom-react';
import type * as Runtime from 'effect/Runtime';
import { useContext, useMemo, useState } from 'react';

import { AiConversation } from '@dxos/assistant';
import { type Blueprint } from '@dxos/blueprints';
import { log } from '@dxos/log';
import { type Queue, type Space } from '@dxos/react-client/echo';
import { useAsyncEffect } from '@dxos/react-ui';

import { AiChatProcessor, type AiChatServices, type AiServicePreset } from '../processor';
import { type Assistant } from '../types';

export type UseChatProcessorProps = {
  space?: Space;
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
  space,
  chat,
  preset,
  services,
  blueprintRegistry,
  settings,
}: UseChatProcessorProps): AiChatProcessor | undefined => {
  const observableRegistry = useContext(RegistryContext);

  // Create conversation from chat queue.
  const [conversation, setConversation] = useState<AiConversation>();
  useAsyncEffect(async () => {
    if (!space || !chat) {
      return;
    }

    // NOTE: Passing in space and getting queue from space rather than resolving the reference.
    //  This is because if the chat isn't in a space yet, the reference will not be resolvable.
    const queue = space.queues.get(chat.queue.dxn);
    const conversation = new AiConversation(queue as Queue<any>);
    await conversation.open();
    setConversation(conversation);
    return () => {
      void conversation.close();
      setConversation(undefined);
    };
  }, [space, chat?.queue.dxn.toString()]);

  // Create processor.
  const processor = useMemo(() => {
    if (!services || !conversation) {
      return undefined;
    }

    log('creating processor', { preset, model: preset?.model, settings });
    return new AiChatProcessor(conversation, services, {
      observableRegistry,
      blueprintRegistry,
      model: preset?.model,
    });
  }, [services, conversation, blueprintRegistry, preset]);

  return processor;
};
