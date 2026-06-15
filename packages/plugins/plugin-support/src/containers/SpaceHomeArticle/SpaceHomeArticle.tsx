//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';

import { Capabilities } from '@dxos/app-framework';
import { useCapabilities, useCapability, useOperationInvoker, usePluginManager } from '@dxos/app-framework/ui';
import { AppCapabilities, LayoutOperation, getObjectPathFromObject, isPersonalSpace } from '@dxos/app-toolkit';
import { Event } from '@dxos/async';
import { Annotation, Collection, Filter, Obj, Order, Query, Type } from '@dxos/echo';
import { HiddenAnnotation, getTypeAnnotation } from '@dxos/echo/Annotation';
import { Kind as EntityKind } from '@dxos/echo/Entity';
import { AssistantCapabilities, AssistantOperation, type ChatType } from '@dxos/plugin-assistant';
import { ChatPrompt, type ChatEvent } from '@dxos/plugin-assistant/components';
import { useChatProcessor, useChatServices, useOnline, usePresets } from '@dxos/plugin-assistant/hooks';
import { type Space, useObject, useQuery, useRegistry } from '@dxos/react-client/echo';
import { Card, Carousel, Icon, IconButton, Panel, ScrollArea, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { Masonry } from '@dxos/react-ui-masonry';
import { Menu, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';
import { getStyles } from '@dxos/ui-theme';

import { meta } from '#meta';
import { HelpOperation } from '#types';

import { WelcomeDismissedAnnotation } from '../../annotations';

/** Number of recently-modified objects to surface as cards. */
const RECENT_LIMIT = 10;

/** Default starter prompts shown when the space has no recent objects yet. */
const SUGGESTION_KEYS = [
  'space-home.suggestion-draft-doc.label',
  'space-home.suggestion-data-type.label',
  'space-home.suggestion-ideas.label',
] as const;

const WELCOME_SLIDE = {
  src: 'https://customer-5rxcjpyab08avpmn.cloudflarestream.com/f58459bcdf3a6f3e93644a4e0f39b22a/iframe?poster=https%3A%2F%2Fcustomer-5rxcjpyab08avpmn.cloudflarestream.com%2Ff58459bcdf3a6f3e93644a4e0f39b22a%2Fthumbnails%2Fthumbnail.jpg%3Ftime%3D%26height%3D600',
  description: 'Welcome to DXOS',
};

export type SpaceHomeArticleProps = {
  role?: string;
  attendableId?: string;
  space: Space | undefined;
};

// TODO(wittjosiah): Factor SpaceHomeArticle out of plugin-support into its own package or plugin-space.
/**
 * Per-space home surface. On the personal space it shows the Welcome content at the top (until
 * dismissed). Below that are the most-recently-modified objects (of registered, non-hidden types),
 * or starter prompts when the space is empty, above the assistant prompt pinned at the bottom.
 */
export const SpaceHomeArticle = ({ role, attendableId, space }: SpaceHomeArticleProps) => {
  const { t } = useTranslation(meta.id);
  const { invokePromise } = useOperationInvoker();

  // Recent objects are scoped to the registered object types contributed to the schema capability,
  // excluding relations, types marked hidden, and collections (structural containers).
  const schemas = useCapabilities(AppCapabilities.Schema);
  const filter = useMemo(() => {
    const collectionTypename = Type.getTypename(Collection.Collection);
    const types = schemas
      .flat()
      .filter(Type.isType)
      .filter((type) => getTypeAnnotation(Type.getSchema(type))?.kind !== EntityKind.Relation)
      .filter((type) => !HiddenAnnotation.get(Type.getSchema(type)).pipe(Option.getOrElse(() => false)))
      .filter((type) => Type.getTypename(type) !== collectionTypename);
    return types.length > 0 ? Filter.or(...types.map((type) => Filter.type(type))) : undefined;
  }, [schemas]);

  const query = useMemo(
    () =>
      Query.select(filter ?? Filter.everything())
        .orderBy(Order.updated('desc'))
        .limit(RECENT_LIMIT),
    [filter],
  );
  const recent = useQuery(filter && space ? space.db : undefined, query);

  const assistantCapabilities = useCapabilities(AssistantCapabilities.State);
  const assistantAvailable = assistantCapabilities.length > 0;

  const [dismissed, setDismissed] = useWelcomeDismissed(space);
  const isPersonal = !!space && isPersonalSpace(space);
  const showWelcome = isPersonal && !dismissed;

  const handleStartTour = useCallback(() => {
    void invokePromise(HelpOperation.Start);
  }, [invokePromise]);

  const handleHideWelcome = useCallback(() => setDismissed(true), [setDismissed]);

  // Reactive toolbar: reads the dismissed annotation via get(Obj.atom(space.properties)) so the
  // menu action graph updates without a React re-render cycle when the annotation changes. Always
  // rendered — actions are hidden when welcome is not shown, but the toolbar slot stays visible so
  // future actions can be added without structural changes.
  const menuActions = useMenuBuilder(
    (get) => {
      const properties = space?.properties ? get(Obj.atom(space.properties)) : undefined;
      const isDismissed = properties
        ? Annotation.get(properties, WelcomeDismissedAnnotation).pipe(Option.getOrElse(() => false))
        : false;
      const showActions = isPersonal && !isDismissed;

      return MenuBuilder.make()
        .action('start-tour', { label: t('start-tour.button'), hidden: !showActions }, handleStartTour)
        .action('hide-welcome', { label: t('hide-welcome.button'), hidden: !showActions }, handleHideWelcome)
        .build();
    },
    [space?.properties, isPersonal, t, handleStartTour, handleHideWelcome],
  );

  // Tile adapter passed to Masonry.Root — closes over `space` so each card can navigate.
  const RecentTile = useMemo(() => {
    const Tile = ({ data }: { data: Obj.Unknown; index: number }) => <RecentObjectTile space={space} object={data} />;
    Tile.displayName = 'RecentObjectTile';
    return Tile;
  }, [space]);

  return (
    <Panel.Root role={role}>
      <Menu.Root {...menuActions} attendableId={attendableId}>
        <Panel.Toolbar asChild>
          <Menu.Toolbar />
        </Panel.Toolbar>
      </Menu.Root>
      <Panel.Content asChild>
        <div className='flex flex-col bs-full min-bs-0'>
          {/* Keep mounted on the personal space (hidden when dismissed) so the Stream iframe is not
              torn down and re-created on every show/hide — that remount was freezing the UI. */}
          {isPersonal && (
            <div className={showWelcome ? 'dx-document shrink-0 p-4 pb-0' : 'hidden'}>
              <WelcomePanel />
            </div>
          )}
          {(recent.length > 0 || assistantAvailable) && (
            <div className='dx-document shrink-0 px-4 py-3'>
              <h2 className='text-sm font-medium text-description'>
                {recent.length > 0 ? t('space-home.recent.heading') : t('space-home.suggestions.heading')}
              </h2>
            </div>
          )}
          {recent.length > 0 ? (
            // Outer div centers to document width with matching px-4 so tiles align with the heading.
            // Masonry.Content fills the padded container and owns scroll.
            <div className='dx-document grow min-bs-0 flex flex-col px-4'>
              <Masonry.Root Tile={RecentTile}>
                <Masonry.Content classNames='grow min-bs-0' padding={false}>
                  <Masonry.Viewport classNames='py-2' items={recent} getId={(obj) => obj.id} />
                </Masonry.Content>
              </Masonry.Root>
            </div>
          ) : assistantAvailable ? (
            <ScrollArea.Root classNames='grow min-bs-0' orientation='vertical'>
              <ScrollArea.Viewport classNames='dx-document flex flex-col gap-2 px-4 pb-4'>
                <SuggestionCards space={space} />
              </ScrollArea.Viewport>
            </ScrollArea.Root>
          ) : (
            // Assistant disabled and no recent objects: show a minimal placeholder.
            <div className='dx-document grow flex items-center justify-center'>
              <p className='text-sm text-description'>{t('space-home.empty.label')}</p>
            </div>
          )}
          {assistantAvailable && (
            <div className='dx-document px-4 pb-4 shrink-0'>
              <SpaceHomePrompt space={space} />
            </div>
          )}
        </div>
      </Panel.Content>
    </Panel.Root>
  );
};

type SpaceScopedProps = {
  space?: Space;
};

/**
 * Reactively read the per-space "welcome dismissed" annotation (synced via space properties) and a
 * setter that persists it. `useObject` subscribes to the properties object, so the Hide button, the
 * Settings "Show welcome page" action, and other devices all re-render live.
 */
const useWelcomeDismissed = (space?: Space): [boolean, (value: boolean) => void] => {
  const [properties, updateProperties] = useObject(space?.properties);
  const dismissed = properties
    ? Annotation.get(properties, WelcomeDismissedAnnotation).pipe(Option.getOrElse(() => false))
    : false;
  const setDismissed = useCallback(
    (value: boolean) => updateProperties((current) => Annotation.set(current, WelcomeDismissedAnnotation, value)),
    [updateProperties],
  );
  return [dismissed, setDismissed];
};

/**
 * Welcome content (personal space): plugin showcase carousel. The guided-tour and dismiss actions
 * live in the panel toolbar (see {@link SpaceHomeArticle}).
 *
 * Memoized (no props) so the home article's ongoing reactive re-renders (recent-objects query, spaces,
 * assistant chat) never re-render the carousel or its cross-origin Cloudflare Stream iframe.
 */
const WelcomePanel = memo(() => {
  const { t } = useTranslation(meta.id);
  const manager = usePluginManager();

  const slides = useMemo(() => {
    const seen = new Set<string>();
    const result: Array<{ key: string; src: string; description: string }> = [{ key: 'welcome', ...WELCOME_SLIDE }];
    for (const plugin of manager.getPlugins()) {
      for (const [index, src] of (plugin.meta.screenshots ?? []).entries()) {
        if (seen.has(src)) {
          continue;
        }
        seen.add(src);
        result.push({
          key: `${plugin.meta.id}:${index}`,
          src,
          // Use the short plugin name — meta.description can be multi-kB and stalls caption/layout.
          description: plugin.meta.name ?? plugin.meta.id,
        });
      }
    }
    return result;
  }, [manager]);

  return (
    <div className='flex flex-col items-center gap-4 pbe-2 border-be border-separator'>
      <h1 className='text-2xl font-semibold'>{t('welcome.title')}</h1>
      <p className='max-w-prose text-center text-description'>{t('welcome.description')}</p>
      {slides.length > 0 && (
        <Carousel.Root count={slides.length}>
          <Carousel.Content classNames='max-w-[50rem]'>
            <Carousel.Previous />
            <Carousel.Viewport>
              {slides.map((slide, index) => (
                <Carousel.Slide key={slide.key} index={index} src={slide.src} alt={slide.description} />
              ))}
            </Carousel.Viewport>
            <Carousel.Next />
            <Carousel.Indicators />
            <Carousel.Caption>{(index) => slides[index]?.description}</Carousel.Caption>
          </Carousel.Content>
        </Carousel.Root>
      )}
    </div>
  );
});

WelcomePanel.displayName = 'WelcomePanel';

/**
 * Input prompt backed by an ephemeral in-memory chat. Its sole responsibility is to collect
 * the user's text, context bindings, and preset choice, then on submit: persist the chat to
 * the space, queue the text as a pending prompt, and navigate to it. AI generation runs in the
 * opened chat view — the processor here exists only to back the context binder UI.
 */
const SpaceHomePrompt = ({ space }: SpaceScopedProps) => {
  const { t } = useTranslation(meta.id);
  const { invokePromise } = useOperationInvoker();

  const registry = useRegistry();
  const atomRegistry = useCapability(Capabilities.AtomRegistry);
  const stateAtom = useCapability(AssistantCapabilities.State);
  const runtime = useChatServices({ id: space?.id });
  const [online, setOnline] = useOnline();
  const { preset, ...presetProps } = usePresets(online);

  // In-memory backing chat (not yet added to the space). `nonce` forces a fresh chat after submit.
  const [chat, setChat] = useState<ChatType.Chat>();
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

  const processor = useChatProcessor({ space, chat, preset, runtime, registry });

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
              <Card.Block>
                <IconButton variant='ghost' label={prompt} icon='ph--sparkle--regular' iconOnly />
              </Card.Block>
              <Card.Title>{prompt}</Card.Title>
            </Card.Header>
          </Card.Root>
        );
      })}
    </>
  );
};

type RecentObjectTileProps = {
  space?: Space;
  object: Obj.Unknown;
};

const RecentObjectTile = ({ space, object }: RecentObjectTileProps) => {
  const { invokePromise } = useOperationInvoker();
  const { t } = useTranslation(meta.id);
  const typename = Obj.getTypename(object);
  const label = toLocalizedString(
    Obj.getLabel(object) ?? (typename ? ['object-name.placeholder', { ns: typename, defaultValue: 'New item' }] : ''),
    t,
  );
  const iconAnnotation = Obj.getIcon(object);
  const icon = iconAnnotation?.icon ?? 'ph--circle-dashed--regular';
  const iconStyles = iconAnnotation?.hue ? getStyles(iconAnnotation.hue) : undefined;

  const handleClick = useCallback(() => {
    if (!space) {
      return;
    }
    void invokePromise(LayoutOperation.Open, { subject: [getObjectPathFromObject(object)] });
  }, [invokePromise, object, space]);

  // TODO(wittjosiah): Use AppSurface.Card once card previews are consistently good for all object types.
  return (
    <Card.Root role='button' classNames='cursor-pointer' onClick={handleClick}>
      <Card.Header>
        <Card.Block>
          <Icon icon={icon} classNames={iconStyles?.text} />
        </Card.Block>
        <Card.Title>{label}</Card.Title>
      </Card.Header>
    </Card.Root>
  );
};
