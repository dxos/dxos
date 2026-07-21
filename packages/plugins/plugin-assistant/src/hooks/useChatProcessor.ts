//
// Copyright 2025 DXOS.org
//

import { RegistryContext } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { useContext, useMemo, useState } from 'react';

import { AiService, OpaqueToolkit } from '@dxos/ai';
import { Capabilities } from '@dxos/app-framework';
import { AppSpace } from '@dxos/app-toolkit';
import { useCapability } from '@dxos/app-framework/ui';
import { AiSession } from '@dxos/assistant';
import { type Chat } from '@dxos/assistant-toolkit';
import { AgentService, Credential, ServiceResolver } from '@dxos/compute';
import { Database, Hypergraph, Obj, Ref, Registry } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { log } from '@dxos/log';
import { useObject, type Space } from '@dxos/react-client/echo';
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

    // Confine the agent session to its own space (agent firewall): resolve/query route through a
    // Hypergraph scoped to the session space, so the agent cannot reach the user's other spaces.
    // See docs/design/agent-firewall.md.
    const runtime = await EffectEx.runAndForwardErrors(
      Effect.runtime<Database.Service>().pipe(Effect.provide(confinedSpaceLayer(space))),
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

    // Provide a session-space Database.Service plus a scoped Hypergraph.Service (agent firewall)
    // instead of resolving Database.Service unscoped via the shared, space-affinity
    // DatabaseLayerSpec — so the agent's tools cannot reach other spaces. The remaining services
    // resolve as usual.
    const spaceLayer = Layer.merge(
      ServiceResolver.provide(
        { space: space.id },
        Credential.CredentialsService,
        AiService.AiService,
        AgentService.AgentService,
        Registry.Service,
        OpaqueToolkit.OpaqueToolkitProvider,
      ).pipe(Layer.provide(Layer.succeed(ServiceResolver.ServiceResolver, serviceResolver))),
      confinedSpaceLayer(space),
    );

    log('creating processor', { preset, model: preset?.model, settings });
    return new AiChatProcessor(session, runtime, feed, spaceLayer, {
      chat: chat ? Ref.make(chat) : undefined,
      observableRegistry,
      registry,
      model: preset?.model,
      // A personal-space chat reads across the user's spaces (tier-1); others stay in their space.
      readScope: AppSpace.isPersonalSpace(space) ? 'membership' : 'home',
    });
  }, [runtime, session, registry, preset, chat, feed, space?.id]);

  return processor;
};

/**
 * Read scope for a chat session (agent firewall). Writes always target the chat's home
 * `Database.Service`; the `Hypergraph.Service` allowlist sets what it may read:
 * - A chat in the **personal space** acts as the user's orchestrator (tier-1) and reads across the
 *   user's spaces (the in-process membership).
 * - Every other chat is confined to its own space (tier-0).
 *
 * See `docs/design/agent-firewall.md`.
 */
const confinedSpaceLayer = (space: Space): Layer.Layer<Database.Service | Hypergraph.Service> => {
  const allowlist = AppSpace.isPersonalSpace(space) ? [...space.db.graph.spaceIds()] : [space.id];
  return Layer.merge(Database.layer(space.db), Hypergraph.scopedLayer(allowlist));
};
