//
// Copyright 2025 DXOS.org
//

import { RegistryContext } from '@effect-atom/atom-react';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { useContext, useMemo, useState } from 'react';

import { AiService, OpaqueToolkit } from '@dxos/ai';
import { Capabilities } from '@dxos/app-framework';
import { useCapability } from '@dxos/app-framework/ui';
import { AiSession } from '@dxos/assistant';
import { type Chat } from '@dxos/assistant-toolkit';
import { AgentService, Credential, ServiceResolver } from '@dxos/compute';
import { Database, Obj, Ref, Registry } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { log } from '@dxos/log';
import { type Space, useObject } from '@dxos/react-client/echo';
import { useAsyncEffect } from '@dxos/react-ui';

import { type Assistant } from '#types';

import { AiChatProcessor, type AiServicePreset } from '../processor';

export type UseChatProcessorProps = {
  space?: Space;
  chat?: Chat.Chat;
  preset?: AiServicePreset;
  runtime?: Capabilities.ProcessManagerRuntime;
  registry?: Registry.Registry;
  settings?: Assistant.Settings;
};

/**
 * Wraps an {@link AiService.Service} so model resolution defaults to the chat's selected provider —
 * the catalog's shared model ids (e.g. `gptOss20b`) are served by several providers, so the provider
 * must accompany the request. A call that supplies its own provider is left untouched.
 */
const withProvider = (service: AiService.Service, provider: string): AiService.Service => ({
  metadata: service.metadata,
  model: (id, options) => service.model(id, { ...options, provider: options?.provider ?? provider }),
});

/**
 * Configure and create AiChatProcessor.
 */
export const useChatProcessor = ({
  space,
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
    if (!space || !chat || !feed) {
      return;
    }

    const runtime = await EffectEx.runAndForwardErrors(
      Effect.runtime<Database.Service>().pipe(Effect.provide(Database.layer(space.db))),
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
  }, [space, chat, feed]);

  const serviceResolver = useCapability(Capabilities.ServiceResolver);

  const processor = useMemo(() => {
    if (!runtime || !session || !chat || !feed || !space) {
      return undefined;
    }

    const spaceLayer = ServiceResolver.provide(
      { space: space.id },
      Database.Service,
      Credential.CredentialsService,
      AiService.AiService,
      AgentService.AgentService,
      Registry.Service,
      OpaqueToolkit.OpaqueToolkitProvider,
    ).pipe(Layer.provide(Layer.succeed(ServiceResolver.ServiceResolver, serviceResolver)));

    // Scope the chat's AiService to the selected provider so shared model ids resolve unambiguously.
    const providerScopedLayer = preset
      ? spaceLayer.pipe(
          Layer.map((context) =>
            Context.add(
              context,
              AiService.AiService,
              withProvider(Context.get(context, AiService.AiService), preset.provider),
            ),
          ),
        )
      : spaceLayer;

    log('creating processor', { preset, model: preset?.model, settings });
    return new AiChatProcessor(session, runtime, feed, providerScopedLayer, {
      chat: chat ? Ref.make(chat) : undefined,
      observableRegistry,
      registry,
      model: preset?.model,
      provider: preset?.provider,
    });
  }, [runtime, session, registry, preset, chat, feed, space?.id]);

  return processor;
};
