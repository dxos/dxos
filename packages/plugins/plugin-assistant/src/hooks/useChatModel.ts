//
// Copyright 2025 DXOS.org
//

import { RegistryContext } from '@effect/atom-react/RegistryContext';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { useContext, useEffect, useMemo, useState } from 'react';

import { AiService, OpaqueToolkit } from '@dxos/ai';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Hooks from '@dxos/app-framework/Hooks';
import { AiSession } from '@dxos/assistant';
import type * as Chat from '@dxos/assistant/Chat';
import * as AgentService from '@dxos/compute/AgentService';
import * as Credential from '@dxos/compute/Credential';
import * as ServiceResolver from '@dxos/compute/ServiceResolver';
import { Database, Obj, Ref, Registry } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import * as EffectEx from '@dxos/effect/EffectEx';
import { log } from '@dxos/log';
import * as UiHooks from '@dxos/react-ui/Hooks';

import { Assistant } from '#types';

import { type AiServicePreset, ChatModel } from '../chat-model/index.ts';

export type UseChatModelProps = {
  db?: Database.Database;
  chat?: Chat.Chat;
  preset?: AiServicePreset;
  runtime?: Capabilities.ProcessManagerRuntime;
  registry?: Registry.Registry;
  settings?: Assistant.Settings;
  /** Attributes the prompts submitted through this chat model to a person (see `ChatModelOptions.sender`). */
  sender?: AgentService.PromptSender;
};

/**
 * Configure and create ChatModel.
 */
export const useChatModel = ({
  db,
  chat,
  preset,
  runtime,
  registry,
  settings,
  sender,
}: UseChatModelProps): ChatModel | undefined => {
  const observableRegistry = useContext(RegistryContext);

  // Reactive subscription — re-renders when the feed ref resolves. Direct `.target` reads are not reactive.
  const [feedSnapshot] = useObject(chat?.feed);
  const feed = Obj.getReactiveOrUndefined(feedSnapshot);

  const [session, setSession] = useState<AiSession.Session>();
  UiHooks.useAsyncEffect(async () => {
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
    const openedAt = performance.now();
    await session.open();
    log('session opened', { chat: chat.id, duration: Math.round(performance.now() - openedAt) });
    setSession(session);
    return () => {
      void session.close();
      setSession(undefined);
    };
  }, [db, chat, feed]);

  const serviceResolver = Hooks.useCapability(Capabilities.ServiceResolver);
  // Primitives rather than the object, so an inline `sender` literal does not rebuild the chat model each render.
  const senderName = sender?.name;
  const senderDid = sender?.identityDid;

  const chatModel = useMemo(() => {
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

    log('creating chat model', { preset, model: preset?.model, settings });
    return new ChatModel(session, runtime, feed, spaceLayer, {
      chat: chat ? Ref.make(chat) : undefined,
      observableRegistry,
      registry,
      model: preset?.model,
      provider: preset?.provider,
      // Absent keys rather than `undefined` values: the sender crosses the process input schema.
      sender:
        senderName || senderDid
          ? { ...(senderName ? { name: senderName } : {}), ...(senderDid ? { identityDid: senderDid } : {}) }
          : undefined,
    });
  }, [runtime, session, registry, preset, chat, feed, db?.spaceId, senderName, senderDid]);

  // A remount (e.g. the user navigated to another page mid-turn) gets a fresh chat model whose
  // active/streaming state starts empty, while the agent process for the feed keeps running;
  // adopting it restores the running indicator and the streamed blocks.
  useEffect(() => chatModel?.adopt(), [chatModel]);

  return chatModel;
};
