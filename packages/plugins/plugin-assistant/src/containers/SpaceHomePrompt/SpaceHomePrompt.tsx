//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import type * as AtomRegistry from 'effect/reactivity/AtomRegistry';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Hooks from '@dxos/app-framework/Hooks';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { AiContext } from '@dxos/assistant';
import * as Chat from '@dxos/assistant/Chat';
import { Event } from '@dxos/async';
import { Database, Feed, Ref } from '@dxos/echo';
import * as EffectEx from '@dxos/effect/EffectEx';
import { log } from '@dxos/log';
import { type Space, useRegistry } from '@dxos/react-client/echo';
import * as UiHooks from '@dxos/react-ui/Hooks';

import { type ChatEvent, ChatPrompt } from '#components';
import { usePresets } from '#hooks';
import { meta } from '#meta';
import { PluginManagerSkill } from '#skills';
import { AssistantCapabilities } from '#types';

import { getChatPath } from '../../paths.ts';
import { defaultChatSkills } from '../../util/default-skills.ts';

type SpaceScopedProps = {
  space?: Space;
};

/**
 * Home article pinned-bottom contributor: the assistant prompt. Backed by an in-memory draft chat
 * that collects the user's text, context bindings, and preset choice; nothing reaches the space until
 * submit, which persists the chat, queues the text as a pending prompt, and navigates to it. AI
 * generation runs in the opened chat view.
 */
export const SpaceHomePrompt = ({ space }: SpaceScopedProps) => {
  const { t } = UiHooks.useTranslation(meta.profile.key);
  const { invokePromise } = Hooks.useOperationInvoker();

  const registry = useRegistry();
  const atomRegistry = Hooks.useCapability(Capabilities.AtomRegistry);
  const stateAtom = Hooks.useCapability(AssistantCapabilities.State);
  const settings = Hooks.useAtomCapability(AssistantCapabilities.Settings);
  const skillDefinitions = Hooks.useCapabilities(AppCapabilities.SkillDefinition);
  const pluginManager = skillDefinitions.some(({ key }) => key === PluginManagerSkill.key);

  // `nonce` starts a fresh draft after submit.
  const [nonce, setNonce] = useState(0);
  const draft = useMemo(() => {
    if (!space) {
      return undefined;
    }
    const feed = Feed.make();
    return { feed, chat: Chat.make({ feed: Ref.make(feed) }) };
  }, [space, nonce]);
  const chat = draft?.chat;
  const context = useDraftContext({ db: space?.db, draft, registry: atomRegistry, pluginManager });
  const { preset, ...presetProps } = usePresets(settings, chat);

  const event = useMemo(() => new Event<ChatEvent>(), []);
  // Held from send until the flush settles, so a second send cannot add the same draft again.
  const submitting = useRef(false);
  useEffect(() => {
    return event.on((ev) => {
      if (ev.type !== 'submit') {
        return;
      }
      const text = ev.text.trim();
      if (!space || !chat || !context || text.length === 0 || submitting.current) {
        return;
      }
      submitting.current = true;

      // Adding the chat stores its feed with it, so the draft's bindings can be written; they land
      // before the chat view opens and reads them.
      space.db.add(chat);
      const chatPath = getChatPath(space.db.spaceId, chat.id);
      void context
        .flush()
        .then(() => {
          atomRegistry.update(stateAtom, (current) => ({
            ...current,
            pendingPrompts: { ...current.pendingPrompts, [chatPath]: text },
          }));
          void invokePromise(LayoutOperation.Open, { subject: [chatPath] });
        })
        .catch((err) => log.catch(err))
        .finally(() => {
          submitting.current = false;
          setNonce((current) => current + 1);
        });
    });
  }, [event, space, chat, context, atomRegistry, stateAtom, invokePromise]);

  if (!space) {
    return null;
  }

  return (
    <ChatPrompt
      {...presetProps}
      outline
      chat={chat}
      db={space.db}
      context={context}
      registry={registry}
      event={event}
      preset={preset?.id}
      placeholder={t('space-home.prompt.placeholder')}
    />
  );
};

SpaceHomePrompt.displayName = 'SpaceHomePrompt';

type UseDraftContextProps = {
  db?: Database.Database;
  draft?: { feed: Feed.Feed; chat: Chat.Chat };
  registry: AtomRegistry.AtomRegistry;
  pluginManager: boolean;
};

/** Binds a draft's default skills and the chat itself, as `CreateChat` does, held in memory until flushed. */
const useDraftContext = ({ db, draft, registry, pluginManager }: UseDraftContextProps) => {
  const [context, setContext] = useState<AiContext.Binder>();
  UiHooks.useAsyncEffect(
    async (controller) => {
      if (!db || !draft) {
        return;
      }
      const runtime = await EffectEx.runAndForwardErrors(
        Effect.context<Database.Service>().pipe(Effect.provide(Database.layer(db))),
      );
      const binder = new AiContext.Binder({ feed: draft.feed, runtime, registry });
      await binder.open();
      await binder.bind({ skills: defaultChatSkills({ pluginManager }), objects: [Ref.make(draft.chat)] });
      // The effect's cleanup is only registered once this returns, so an unmount mid-open closes here.
      if (controller.signal.aborted) {
        void binder.close();
        return;
      }
      setContext(binder);
      return () => {
        setContext(undefined);
        void binder.close();
      };
    },
    [db, draft, registry, pluginManager],
  );
  return context;
};
