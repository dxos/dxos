//
// Copyright 2025 DXOS.org
//

import { type Registry, RegistryContext } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { useContext, useMemo, useState } from 'react';

import { AiService } from '@dxos/ai';
import { Capabilities } from '@dxos/app-framework';
import { useCapability } from '@dxos/app-framework/ui';
import { AgentService, AiSession } from '@dxos/assistant';
import { type Chat } from '@dxos/assistant-toolkit';
import { type Blueprint } from '@dxos/blueprints';
import { Database, Feed, Ref } from '@dxos/echo';
import { createFeedServiceLayer } from '@dxos/echo-db';
import { runAndForwardErrors } from '@dxos/effect';
import { CredentialsService, QueueService, ServiceResolver } from '@dxos/functions';
import { log } from '@dxos/log';
import { OperationRegistry } from '@dxos/operation';
import { type Space } from '@dxos/react-client/echo';
import { useAsyncEffect } from '@dxos/react-ui';

import { type Assistant } from '#types';

import { AiChatProcessor, type AiServicePreset } from '../processor';

export type UseChatProcessorProps = {
  space?: Space;
  chat?: Chat.Chat;
  preset?: AiServicePreset;
  runtime?: Capabilities.ProcessManagerRuntime;
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

  const [session, setSession] = useState<AiSession>();
  useAsyncEffect(async () => {
    if (!space || !chat) {
      return;
    }

    const feedTarget = chat.feed.target;
    if (!feedTarget) {
      return;
    }
    const feedServiceLayer = createFeedServiceLayer(space.queues);
    const runtime = await runAndForwardErrors(
      Effect.runtime<Feed.FeedService>().pipe(Effect.provide(feedServiceLayer)),
    );
    const session = new AiSession({
      feed: feedTarget,
      runtime,
      registry: observableRegistry as Registry.Registry,
    });
    await session.open();
    setSession(session);
    return () => {
      void session.close();
      setSession(undefined);
    };
  }, [space, chat?.feed.target]);

  const feed = chat?.feed.target;
  const serviceResolver = useCapability(Capabilities.ServiceResolver);

  const processor = useMemo(() => {
    if (!runtime || !session || !chat || !feed || !space) {
      return undefined;
    }

    const spaceLayer = ServiceResolver.provide(
      { space: space.id },
      Database.Service,
      QueueService,
      Feed.FeedService,
      CredentialsService,
      AiService.AiService,
      AgentService.AgentService,
      OperationRegistry.Service,
    ).pipe(Layer.provide(Layer.succeed(ServiceResolver.ServiceResolver, serviceResolver)));

    log('creating processor', { preset, model: preset?.model, settings });
    return new AiChatProcessor(session, runtime, feed, spaceLayer, {
      chat: chat ? Ref.make(chat) : undefined,
      observableRegistry,
      blueprintRegistry,
      model: preset?.model,
    });
  }, [runtime, session, blueprintRegistry, preset, feed, space?.id]);

  return processor;
};
