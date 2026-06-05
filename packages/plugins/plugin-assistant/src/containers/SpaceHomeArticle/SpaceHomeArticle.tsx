//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { Capabilities } from '@dxos/app-framework';
import { useAtomCapability, useCapabilities, useCapability, useOperationInvoker } from '@dxos/app-framework/ui';
import { AppCapabilities, LayoutOperation, getObjectPathFromObject } from '@dxos/app-toolkit';
import { type Chat } from '@dxos/assistant-toolkit';
import { Event } from '@dxos/async';
import { Filter, Obj, Order, Query, Type } from '@dxos/echo';
import { EntityKind, HiddenAnnotation, getTypeAnnotation } from '@dxos/echo/internal';
import { type Space, useQuery, useRegistry, useSpaces } from '@dxos/react-client/echo';
import { Card, Panel, ScrollArea, Toolbar, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { getStyles } from '@dxos/ui-theme';

import { type ChatEvent } from '#components';
import { useChatProcessor, useChatServices, useOnline, usePresets } from '#hooks';
import { SPACE_HOME_SUBJECT_PREFIX, meta } from '#meta';
import { AssistantCapabilities, AssistantOperation } from '#types';

import { ChatPrompt } from '../../components/ChatPrompt';

/** Number of recently-modified objects to surface as cards. */
const RECENT_LIMIT = 3;

/** Default starter prompts shown when the space has no recent objects yet. */
const SUGGESTION_KEYS = [
  'space-home.suggestion.summarize',
  'space-home.suggestion.draft-doc',
  'space-home.suggestion.ideas',
] as const;

export type SpaceHomeArticleProps = {
  role?: string;
  /** Surface subject: `${SPACE_HOME_SUBJECT_PREFIX}${space.id}`. */
  subject: string;
};

/**
 * Per-space home surface. Shows the most-recently-modified objects (of registered, non-hidden
 * types) as cards, with default starter prompts when the space is empty, above the assistant
 * prompt. The prompt is backed by an in-memory chat; submitting persists that chat to the space,
 * navigates to it, and the message is submitted there.
 */
export const SpaceHomeArticle = ({ role, subject }: SpaceHomeArticleProps) => {
  const { t } = useTranslation(meta.id);

  const spaceId = subject.slice(SPACE_HOME_SUBJECT_PREFIX.length);
  const spaces = useSpaces();
  const space = useMemo(() => spaces.find((current) => current.id === spaceId), [spaces, spaceId]);

  // Recent objects are scoped to the registered object types contributed to the schema capability,
  // excluding relations and types marked hidden.
  const schemas = useCapabilities(AppCapabilities.Schema);
  const filter = useMemo(() => {
    const types = schemas
      .flat()
      .filter(Type.isType)
      .filter((type) => getTypeAnnotation(Type.getSchema(type))?.kind !== EntityKind.Relation)
      .filter((type) => !HiddenAnnotation.get(Type.getSchema(type)).pipe(Option.getOrElse(() => false)));
    return types.length > 0 ? Filter.or(...types.map((type) => Filter.typename(Type.getTypename(type)))) : undefined;
  }, [schemas]);

  const query = useMemo(
    () =>
      Query.select(filter ?? Filter.everything())
        .orderBy(Order.updated('desc'))
        .limit(RECENT_LIMIT),
    [filter],
  );
  const recent = useQuery(filter && space ? space.db : undefined, query);

  return (
    <Panel.Root role={role}>
      <Panel.Content asChild>
        {/* Match the AI chat content width (`dx-document`): recent/suggestions at the top, prompt pinned at the bottom. */}
        <div className='flex flex-col bs-full min-bs-0'>
          <ScrollArea.Root classNames='grow min-bs-0' orientation='vertical'>
            <ScrollArea.Viewport classNames='dx-document flex flex-col gap-4 p-4'>
              <h2 className='text-sm font-medium text-description'>
                {recent.length > 0 ? t('space-home.recent.heading') : t('space-home.suggestions.heading')}
              </h2>
              <div className='flex flex-col gap-2'>
                {recent.length > 0 ? (
                  recent.map((object) => <RecentObjectCard key={object.id} space={space} object={object} />)
                ) : (
                  <SuggestionCards space={space} />
                )}
              </div>
            </ScrollArea.Viewport>
          </ScrollArea.Root>
          <div className='dx-document px-4 pb-4'>
            <SpaceHomePrompt space={space} />
          </div>
        </div>
      </Panel.Content>
    </Panel.Root>
  );
};

type SpaceScopedProps = {
  space?: Space;
};

/**
 * The assistant prompt, backed by an in-memory chat. On submit the chat is persisted to the space,
 * the message is queued as a pending prompt, and the chat is opened (where the prompt is submitted).
 */
const SpaceHomePrompt = ({ space }: SpaceScopedProps) => {
  const { t } = useTranslation(meta.id);
  const { invokePromise } = useOperationInvoker();
  const registry = useRegistry();
  const settings = useAtomCapability(AssistantCapabilities.Settings);
  const atomRegistry = useCapability(Capabilities.AtomRegistry);
  const stateAtom = useCapability(AssistantCapabilities.State);
  const runtime = useChatServices({ id: space?.id });
  const [online, setOnline] = useOnline();
  const { preset, ...presetProps } = usePresets(online);

  // In-memory backing chat (not yet added to the space). `nonce` forces a fresh chat after submit.
  const [chat, setChat] = useState<Chat.Chat>();
  const [nonce, setNonce] = useState(0);
  useEffect(() => {
    if (!space) {
      setChat(undefined);
      return;
    }
    let cancelled = false;
    void invokePromise(AssistantOperation.CreateChat, { db: space.db, addToSpace: false }).then((result) => {
      if (!cancelled) {
        setChat(result.data?.object);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [space, nonce, invokePromise]);

  const processor = useChatProcessor({ space, chat, preset, runtime, registry, settings });

  const event = useMemo(() => new Event<ChatEvent>(), []);
  useEffect(() => {
    return event.on((ev) => {
      if (ev.type !== 'submit') {
        return;
      }
      const text = ev.text.trim();
      if (!space || !chat || text.length === 0) {
        return;
      }

      // Persist the in-memory chat, queue the prompt, and open the chat (which submits it).
      space.db.add(chat);
      const chatPath = getObjectPathFromObject(chat);
      atomRegistry.update(stateAtom, (current) => ({
        ...current,
        pendingPrompts: { ...current.pendingPrompts, [chatPath]: text },
      }));
      void invokePromise(LayoutOperation.Open, { subject: [chatPath] });
      setNonce((current) => current + 1);
    });
  }, [event, space, chat, atomRegistry, stateAtom, invokePromise]);

  if (!processor || !chat || !space) {
    return null;
  }

  return (
    <ChatPrompt
      {...presetProps}
      outline
      chat={chat}
      db={space.db}
      processor={processor}
      event={event}
      preset={preset?.id}
      online={online}
      onOnlineChange={setOnline}
      placeholder={t('space-home.prompt.placeholder')}
    />
  );
};

const SuggestionCards = ({ space }: SpaceScopedProps) => {
  const { t } = useTranslation(meta.id);
  const { invokePromise } = useOperationInvoker();

  const handleRunPrompt = useCallback(
    (prompt: string) => {
      if (!space) {
        return;
      }
      void invokePromise(AssistantOperation.RunPromptInNewChat, { db: space.db, prompt });
    },
    [invokePromise, space],
  );

  return (
    <>
      {SUGGESTION_KEYS.map((key) => {
        const prompt = t(key);
        return (
          <Card.Root
            key={key}
            fullWidth
            role='button'
            classNames='cursor-pointer'
            onClick={() => handleRunPrompt(prompt)}
          >
            <Card.Header>
              <Toolbar.IconButton variant='ghost' label={prompt} icon='ph--sparkle--regular' iconOnly />
              <Card.Title>{prompt}</Card.Title>
            </Card.Header>
          </Card.Root>
        );
      })}
    </>
  );
};

type RecentObjectCardProps = {
  space?: Space;
  object: Obj.Unknown;
};

const RecentObjectCard = ({ space, object }: RecentObjectCardProps) => {
  const { t } = useTranslation(meta.id);
  const { invokePromise } = useOperationInvoker();

  const typename = Obj.getTypename(object) ?? '';
  const label =
    Obj.getLabel(object) ??
    toLocalizedString(['object-name.placeholder', { ns: typename, defaultValue: object.id }], t);
  const iconAnnotation = Obj.getIcon(object);
  const icon = iconAnnotation?.icon ?? 'ph--circle-dashed--regular';
  const styles = iconAnnotation?.hue ? getStyles(iconAnnotation.hue) : undefined;

  const handleClick = useCallback(() => {
    if (!space) {
      return;
    }
    void invokePromise(LayoutOperation.Open, { subject: [getObjectPathFromObject(object)] });
  }, [invokePromise, object, space]);

  return (
    <Card.Root fullWidth role='button' classNames='cursor-pointer' onClick={handleClick}>
      <Card.Header>
        <Toolbar.IconButton variant='ghost' label={label} icon={icon} iconOnly iconClassNames={styles?.fg} />
        <Card.Title>{label}</Card.Title>
      </Card.Header>
    </Card.Root>
  );
};
