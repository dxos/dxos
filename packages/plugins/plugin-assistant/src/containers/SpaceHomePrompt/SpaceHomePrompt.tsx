//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import type * as AtomRegistry from 'effect/reactivity/AtomRegistry';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

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
import { AssistantCapabilities } from '#types';

import { getChatPath } from '../../paths.ts';
import { bindChatDefaults, contributesPluginManager } from '../../util/default-skills.ts';

type SpaceScopedProps = {
  space?: Space;
};

export const SpaceHomePrompt = ({ space }: SpaceScopedProps) => {
  const { t } = UiHooks.useTranslation(meta.profile.key);

  const registry = useRegistry();
  const atomRegistry = Hooks.useCapability(Capabilities.AtomRegistry);
  const settings = Hooks.useAtomCapability(AssistantCapabilities.Settings);
  const pluginManager = contributesPluginManager(Hooks.useCapabilities(AppCapabilities.SkillDefinition));

  const [draftGeneration, setDraftGeneration] = useState(0);
  const draft = useMemo(() => {
    if (!space) {
      return undefined;
    }
    const feed = Feed.make();
    return { feed, chat: Chat.make({ feed: Ref.make(feed) }) };
  }, [space, draftGeneration]);
  const chat = draft?.chat;
  const context = useDraftContext({ db: space?.db, draft, registry: atomRegistry, pluginManager });
  const { preset, ...presetProps } = usePresets(settings, chat);

  const startNewDraft = useCallback(() => setDraftGeneration((current) => current + 1), []);
  const event = useDraftSend({ space, draft, context, onSent: startNewDraft });

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

type UseDraftSendProps = {
  space?: Space;
  draft?: { feed: Feed.Feed; chat: Chat.Chat };
  context?: AiContext.Binder;
  onSent: () => void;
};

/** Stores the draft's chat and bindings, then opens it; a failed send removes what it stored and restores the text. */
const useDraftSend = ({ space, draft, context, onSent }: UseDraftSendProps) => {
  const { invokePromise } = Hooks.useOperationInvoker();
  const atomRegistry = Hooks.useCapability(Capabilities.AtomRegistry);
  const stateAtom = Hooks.useCapability(AssistantCapabilities.State);
  const event = useMemo(() => new Event<ChatEvent>(), []);
  useEffect(() => {
    return event.on((ev) => {
      if (ev.type !== 'submit') {
        return;
      }
      const text = ev.text.trim();
      if (!space || !draft || !context || text.length === 0) {
        return;
      }

      const { feed, chat } = draft;
      space.db.add(feed);
      space.db.add(chat);
      const chatPath = getChatPath(space.db.spaceId, chat.id);
      onSent();
      void context
        .flush()
        .then(() => {
          atomRegistry.update(stateAtom, (current) => ({
            ...current,
            pendingPrompts: { ...current.pendingPrompts, [chatPath]: text },
          }));
          void invokePromise(LayoutOperation.Open, { subject: [chatPath] });
        })
        .catch((err) => {
          log.catch(err);
          space.db.remove(chat);
          space.db.remove(feed);
          event.emit({ type: 'update-prompt', text });
        });
    });
  }, [event, space, draft, context, atomRegistry, stateAtom, invokePromise, onSent]);
  return event;
};

type UseDraftContextProps = {
  db?: Database.Database;
  draft?: { feed: Feed.Feed; chat: Chat.Chat };
  registry: AtomRegistry.AtomRegistry;
  pluginManager: boolean;
};

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
      const binder = new AiContext.Binder({ feed: draft.feed, runtime, registry, hold: true });
      await binder.open();
      await bindChatDefaults(binder, { chat: draft.chat, pluginManager });
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
