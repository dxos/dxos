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
import type * as Skill from '@dxos/compute/Skill';
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
import { bindChatDefaults } from '../../util/default-skills.ts';

type SpaceScopedProps = {
  space?: Space;
};

export const SpaceHomePrompt = ({ space }: SpaceScopedProps) => {
  const { t } = UiHooks.useTranslation(meta.profile.key);
  const { invokePromise } = Hooks.useOperationInvoker();

  const registry = useRegistry();
  const atomRegistry = Hooks.useCapability(Capabilities.AtomRegistry);
  const stateAtom = Hooks.useCapability(AssistantCapabilities.State);
  const settings = Hooks.useAtomCapability(AssistantCapabilities.Settings);
  const skillDefinitions = Hooks.useCapabilities(AppCapabilities.SkillDefinition);

  const [draftGeneration, setDraftGeneration] = useState(0);
  const draft = useMemo(() => {
    if (!space) {
      return undefined;
    }
    const feed = Feed.make();
    return { feed, chat: Chat.make({ feed: Ref.make(feed) }) };
  }, [space, draftGeneration]);
  const chat = draft?.chat;
  const context = useDraftContext({ db: space?.db, draft, registry: atomRegistry, skillDefinitions });
  const { preset, ...presetProps } = usePresets(settings, chat);

  const event = useMemo(() => new Event<ChatEvent>(), []);
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
          setDraftGeneration((current) => current + 1);
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
  skillDefinitions: readonly Skill.Definition[];
};

const useDraftContext = ({ db, draft, registry, skillDefinitions }: UseDraftContextProps) => {
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
      await bindChatDefaults(binder, { chat: draft.chat, contributed: skillDefinitions });
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
    [db, draft, registry, skillDefinitions],
  );
  return context;
};
