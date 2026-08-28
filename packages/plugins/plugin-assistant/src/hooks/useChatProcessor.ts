//
// Copyright 2025 DXOS.org
//

import { RegistryContext } from '@effect/atom-react/RegistryContext';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { useContext, useEffect, useMemo, useState } from 'react';

import { AiService, OpaqueToolkit } from '@dxos/ai';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import { useCapability } from '@dxos/app-framework/ui';
import { AiSession } from '@dxos/assistant';
import { type Chat } from '@dxos/assistant-toolkit';
import * as AgentService from '@dxos/compute/AgentService';
import * as Credential from '@dxos/compute/Credential';
import * as ServiceResolver from '@dxos/compute/ServiceResolver';
import { Database, Obj, Ref, Registry } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { EffectEx } from '@dxos/effect';
import { log } from '@dxos/log';
import { useAsyncEffect } from '@dxos/react-ui';

import { Assistant } from '#types';

import { AiChatProcessor, type AiServicePreset } from '../processor';

export type UseChatProcessorProps = {
  db?: Database.Database;
  chat?: Chat.Chat;
  preset?: AiServicePreset;
  runtime?: Capabilities.ProcessManagerRuntime;
  registry?: Registry.Registry;
  settings?: Assistant.Settings;
};

/**
 * Configure and create AiChatProcessor.
 */
export const useChatProcessor = ({
  db,
  chat,
  preset,
  runtime,
  registry,
  settings,
}: UseChatProcessorProps): AiChatProcessor | undefined => {
  const observableRegistry = useContext(RegistryContext);

  // Reactive subscription — re-renders when the feed ref resolves. Direct `.target` reads are not reactive.
  const [feedSnapshot] = useObject(chat?.feed);
  const feed = Obj.getReactiveOrUndefined(feedSnapshot);

  const [session, setSession] = useState<AiSession.Session>();
  useAsyncEffect(async () => {
    if (!db || !chat || !feed) {
      return;
    }

    const runtime = await EffectEx.runAndForwardErrors(
      Effect.context<Database.Service>().pipe(Effect.provide(Database.layer(db))),
    );
    const session = new AiSession.Session({
      feed,
      runtime,
      registry: observableRegistry,
    });
    await session.open();
    setSession(session);
    return () => {
      void session.close();
      setSession(undefined);
    };
  }, [db, chat, feed]);

  const serviceResolver = useCapability(Capabilities.ServiceResolver);

  const processor = useMemo(() => {
    if (!runtime || !session || !chat || !feed || !db) {
      return undefined;
    }

    const spaceLayer = ServiceResolver.provide(
      { space: db.spaceId },
      Database.Service,
      Credential.CredentialsService,
      AiService.AiService,
      AgentService.AgentService,
      Registry.Service,
      OpaqueToolkit.OpaqueToolkitProvider,
    ).pipe(Layer.provide(Layer.succeed(ServiceResolver.ServiceResolver, serviceResolver)));

    log('creating processor', { preset, model: preset?.model, settings });
    return new AiChatProcessor(session, runtime, feed, spaceLayer, {
      chat: chat ? Ref.make(chat) : undefined,
      observableRegistry,
      registry,
      model: preset?.model,
      provider: preset?.provider,
    });
  }, [runtime, session, registry, preset, chat, feed, db?.spaceId]);

  // A remount (e.g. the user navigated to another page mid-turn) gets a fresh processor whose
  // active/streaming state starts empty, while the agent process for the feed keeps running;
  // adopting it restores the running indicator and the streamed blocks.
  useEffect(() => processor?.adopt(), [processor]);

  return processor;
};
