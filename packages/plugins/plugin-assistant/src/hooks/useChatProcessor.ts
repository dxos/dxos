//
// Copyright 2025 DXOS.org
//

import { type Registry, RegistryContext } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import * as Runtime from 'effect/Runtime';
import { useContext, useMemo, useState } from 'react';

import { Feed, Ref } from '@dxos/echo';
import { AiConversation } from '@dxos/assistant';
import { type Chat } from '@dxos/assistant-toolkit';
import { type Blueprint } from '@dxos/blueprints';
import { createFeedServiceLayer } from '@dxos/echo-db';
import { log } from '@dxos/log';
import { type Space } from '@dxos/react-client/echo';
import { useAsyncEffect } from '@dxos/react-ui';
import { type AutomationCapabilities } from '@dxos/plugin-automation/types';

import { AiChatProcessor, type AiServicePreset } from '../processor';
import { type Assistant } from '#types';

export type UseChatProcessorProps = {
  space?: Space;
  chat?: Chat.Chat;
  preset?: AiServicePreset;
  runtime?: AutomationCapabilities.ComputeRuntime;
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
  runtime,
  blueprintRegistry,
  settings,
}: UseChatProcessorProps): AiChatProcessor | undefined => {
  const observableRegistry = useContext(RegistryContext);

  const [conversation, setConversation] = useState<AiConversation>();
  useAsyncEffect(async () => {
    if (!space || !chat) {
      return;
    }

    const feedTarget = chat.feed.target;
    if (!feedTarget) {
      return;
    }
    const feedServiceLayer = createFeedServiceLayer(space.queues);
    const feedRuntime = await Effect.runPromise(
      Effect.runtime<Feed.FeedService>().pipe(Effect.provide(feedServiceLayer)),
    );
    const conversation = new AiConversation({
      feed: feedTarget,
      feedRuntime,
      registry: observableRegistry as Registry.Registry,
    });
    await conversation.open();
    setConversation(conversation);
    return () => {
      void conversation.close();
      setConversation(undefined);
    };
  }, [space, chat?.feed.target]);

  const feed = chat?.feed.target;

  const processor = useMemo(() => {
    if (!runtime || !conversation || !chat || !feed) {
      return undefined;
    }

    log('creating processor', { preset, model: preset?.model, settings });
    return new AiChatProcessor(conversation, runtime, feed, {
      chat: chat ? Ref.make(chat) : undefined,
      observableRegistry,
      blueprintRegistry,
      model: preset?.model,
    });
  }, [runtime, conversation, blueprintRegistry, preset, feed]);

  return processor;
};
