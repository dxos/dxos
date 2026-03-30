//
// Copyright 2025 DXOS.org
//

import { type Registry, RegistryContext } from '@effect-atom/atom-react';
import type * as Runtime from 'effect/Runtime';
import { useCallback, useContext, useMemo, useState } from 'react';

import { type Graph } from '@dxos/app-graph';
import { Ref } from '@dxos/echo';
import { AiConversation } from '@dxos/assistant';
import { type Chat } from '@dxos/assistant-toolkit';
import { type Blueprint } from '@dxos/blueprints';
import { log } from '@dxos/log';
import { type AttentionManager, createAmbientFocusContext } from '@dxos/plugin-attention';
import { type Queue, type Space } from '@dxos/react-client/echo';
import { useAsyncEffect } from '@dxos/react-ui';

import { AiChatProcessor, type AiChatServices, type AiServicePreset } from '../processor';
import { type Assistant } from '../types';

export type UseChatProcessorProps = {
  space?: Space;
  chat?: Chat.Chat;
  preset?: AiServicePreset;
  services?: () => Promise<Runtime.Runtime<AiChatServices>>;
  blueprintRegistry?: Blueprint.Registry;
  settings?: Assistant.Settings;
  /** Attention manager for ambient focus context injection. */
  attention?: AttentionManager;
  /** App graph for resolving attention IDs to ECHO nodes. */
  graph?: Graph.ReadableGraph;
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
  attention,
  graph,
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
    const conversation = new AiConversation({
      queue: queue as Queue<any>,
      registry: observableRegistry as Registry.Registry,
    });
    await conversation.open();
    setConversation(conversation);
    return () => {
      void conversation.close();
      setConversation(undefined);
    };
  }, [space, chat?.queue.dxn.toString()]);

  // Create ambient focus getter.
  const getAmbientFocus = useCallback(() => {
    if (!attention || !graph) {
      return undefined;
    }
    return createAmbientFocusContext({ attention, graph });
  }, [attention, graph]);

  // Create processor.
  const processor = useMemo(() => {
    if (!services || !conversation) {
      return undefined;
    }

    log('creating processor', { preset, model: preset?.model, settings });
    return new AiChatProcessor(conversation, services, {
      chat: chat ? Ref.make(chat) : undefined,
      observableRegistry,
      blueprintRegistry,
      model: preset?.model,
      getAmbientFocus,
    });
  }, [services, conversation, blueprintRegistry, preset, getAmbientFocus]);

  return processor;
};
