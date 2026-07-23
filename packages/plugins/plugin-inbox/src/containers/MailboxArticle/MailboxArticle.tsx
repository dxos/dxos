//
// Copyright 2025 DXOS.org
//

import { Atom, useAtomValue } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import React, { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  useAtomCapability,
  useAtomCapabilityState,
  useCapabilities,
  useOperationInvoker,
  useOptionalCapability,
} from '@dxos/app-framework/ui';
import { AppCapabilities, LayoutOperation } from '@dxos/app-toolkit';
import { type AppSurface, ProgressMeter, useAppGraph, useProgress, useShowItem } from '@dxos/app-toolkit/ui';
import { Aggregate, Database, Ref as EchoRef, Filter, Obj, Order, Query, Scope, Tag } from '@dxos/echo';
import { QueryBuilder } from '@dxos/echo-query';
import { usePagination, useQuery, useResolveRef } from '@dxos/echo-react';
import { invariant } from '@dxos/invariant';
import { type EntityId } from '@dxos/keys';
import { log } from '@dxos/log';
import { useActionRunner } from '@dxos/plugin-graph';
import { AtomState, useAtomState } from '@dxos/react-hooks';
import { ElevationProvider, Icon, Panel } from '@dxos/react-ui';
import { linkedSegment, useArticleKeyboardNavigation, useSelection } from '@dxos/react-ui-attention';
import { type EditorController } from '@dxos/react-ui-editor';
import {
  Menu,
  MenuBuilder,
  TOOLBAR_DISPOSITION,
  graphActions,
  isToolbarAction,
  useMenuBuilder,
} from '@dxos/react-ui-menu';
import { TagIndex } from '@dxos/schema';
import { DraftMessage, Message } from '@dxos/types';

import {
  MessageStack,
  type MessageStackActionHandler,
  type MessageStackItem,
  type MessageTagsFamily,
  isMessageGroup,
  useInjectedMailboxActions,
  useMailboxExtractorActions,
} from '#components';
import { useDebouncedValue } from '#hooks';
import { meta } from '#meta';
import { InboxOperation } from '#types';
import { InboxCapabilities, Mailbox, SystemTags } from '#types';

import { POPOVER_SAVE_FILTER } from '../../constants';
import { createSyncProgressKey } from '../../operations/mail/mail-sync';
import { messageMatchesQuery, sortByCreated } from '../../util';
import { InitializeMailbox } from './InitializeMailbox';
import { buildMailboxSelection, buildSystemTagSelection, getSearchText } from './mailbox-search';
import { MailboxFilter } from './MailboxFilter';

/** Messages per page for the lazily-loaded message window. */
const MAILBOX_PAGE_SIZE = 10;

/** Messages shown in a conversation card preview; the full thread size is surfaced via the group `count`. */
const MAILBOX_THREAD_PREVIEW_COUNT = 4;

export type MailboxArticleProps = AppSurface.ObjectArticleProps<
  Mailbox.Mailbox,
  {
    filter?: string;
    /**
     * Canonical system tag (Inbox/Sent/Draft) this view resolves by id, not by parsing `filter` as tag
     * text — stays correct regardless of label/provider. `filter` seeds the editable box; once edited
     * away from that seed, normal text/tag parsing takes over (Drafts hides the box — see `hideFilterEditor`).
     */
    systemTag?: SystemTags.SystemTagId;
  }
>;

export const MailboxArticle = ({
  subject: mailbox,
  filter: filterProp,
  systemTag,
  attendableId,
}: MailboxArticleProps) => {
  const { invokePromise } = useOperationInvoker();
  const settings = useAtomCapability(InboxCapabilities.Settings);
  const id = attendableId ?? Obj.getURI(mailbox);
  const currentId = useSelection(id, 'single');
  const db = Obj.getDatabase(mailbox);
  const showItem = useShowItem();
  const runAction = useActionRunner();

  // Gmail sync registers a monitor keyed by the mailbox URI (`#sync`); show it in the statusbar.
  const progress = useProgress(createSyncProgressKey(mailbox));
  // Registry (present when plugin-progress is loaded) lets the meter cancel a cancellable run.
  const progressRegistry = useOptionalCapability(AppCapabilities.ProgressRegistry);

  const filterEditorRef = useRef<EditorController>(null);
  const filterSaveButtonRef = useRef<HTMLButtonElement>(null);

  // Menu state.
  const sortDescending = useAtomState(true);

  const tagMap = useTags(db);
  const feed = useResolveRef(mailbox.feed);
  const tagIndex = useResolveRef(mailbox.tags);
  // Per-message tag chips, as an atom family so each tile subscribes to only its own message's tags.
  const tagsAtom = useMessageTagsAtomFamily(tagIndex, tagMap);

  // Starred messages drive the per-tile star toggle; starred state also lives under the tag index.
  const starredUri = useSystemTagUri(db, 'starred');
  const starredAtom = useMemo(() => SystemTags.tagAtom(tagIndex, starredUri), [tagIndex, starredUri]);

  // This view's canonical system tag, resolved by id (`undefined` until sync/first draft creates it).
  const systemTagUri = useSystemTagUri(db, systemTag);
  const systemTagIds = useTaggedIds(tagIndex, systemTagUri);
  // This mailbox's space-resident messages (drafts + not-yet-synced sent), by thread — attached to an
  // already-shown thread regardless of view or tag (see `useSpaceMessagesByThreadId`).
  const spaceMessagesByThreadId = useSpaceMessagesByThreadId(db, mailbox);

  // Filter.
  const builder = useMemo(() => new QueryBuilder(tagMap), [tagMap]);
  const [filterText, setFilterText] = useState<string>(filterProp ?? '');
  const [filter, setFilter] = useState<Filter.Any>();
  useEffect(() => {
    const { filter } = builder.build(filterText);
    setFilter(filter);
  }, [filterText, builder]);

  // Whether messages are grouped into conversations (threads). On by default.
  const conversations = settings.conversations ?? true;
  const direction = sortDescending.value ? 'desc' : 'asc';

  // The ECHO query (and the `searchQuery` that drives highlighting) is driven by a DEBOUNCED value so
  // typing in the filter editor doesn't rebuild the paginated store and flash the list empty on every
  // keystroke — the query's AST only changes once typing pauses. The editor itself, and the
  // save-filter gating below, stay bound to the immediate `filterText`/`filter`. (`useDeferredValue`
  // is insufficient here: it still commits every intermediate keystroke, just at a lower priority, so
  // the query AST — and thus `usePagination`'s store — still changes on each keypress.)
  const debouncedFilterText = useDebouncedValue(filterText, 300);
  const debouncedFilter = useMemo(() => builder.build(debouncedFilterText).filter, [debouncedFilterText, builder]);

  // Order by message `created` (not feed insertion order): a backward/backfill sync appends out of
  // date order. The mailbox reads and sorts/groups the whole feed client-side; `usePagination` and
  // the virtualizer bound only what's rendered, not what's fetched. Bounded-memory windowing isn't
  // possible here — ordering threads by a `max(created)` aggregate needs the full set to rank them.

  // True while the filter box still shows its seeded text (`'#inbox'` etc.) unedited, so the tag-id
  // selection applies; editing away falls back to normal text/tag parsing (Drafts hides the box).
  const isUnmodifiedSystemTagView = systemTag !== undefined && debouncedFilterText === (filterProp ?? '');
  const systemTagIdsKey = systemTagIds.join(',');
  const selection = useMemo(
    () =>
      isUnmodifiedSystemTagView
        ? buildSystemTagSelection(systemTagIds)
        : buildMailboxSelection(debouncedFilterText, debouncedFilter),
    // systemTagIds is a fresh array each render; key on its membership (systemTagIdsKey) instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isUnmodifiedSystemTagView, systemTagIdsKey, debouncedFilterText, debouncedFilter],
  );
  const searchQuery = useMemo(() => getSearchText(debouncedFilter), [debouncedFilter]);
  // Inbox/Sent/Drafts union the feed with the space (where drafts live); each view's ids only ever
  // resolve on one side, so the other half is just empty. Free text stays feed-only (too complex to
  // scope by mailbox over the whole space — see `hideFilterEditor`).
  // TODO: unify with `spaceMessagesByThreadId`'s separate query below into one query once the query
  // engine can express "thread contains a matching member" directly (semi-join).
  const source = isUnmodifiedSystemTagView
    ? Query.all(Query.select(selection).from(Scope.space()), ...(feed ? [Query.select(selection).from(feed)] : []))
    : feed
      ? Query.select(selection).from(feed)
      : undefined;
  const pagination = usePagination(
    db,
    source
      ? conversations
        ? source
            .orderBy(Order.property('created', 'desc'))
            .aggregate({
              threadId: Aggregate.group('threadId'),
              lastMessageAt: Aggregate.max('created'),
              count: Aggregate.count(),
              items: Aggregate.items({ limit: MAILBOX_THREAD_PREVIEW_COUNT }),
            })
            .orderBy(Order.property('lastMessageAt', direction))
            .limit(MAILBOX_PAGE_SIZE)
        : source.orderBy(Order.property('created', direction)).limit(MAILBOX_PAGE_SIZE)
      : Query.select(Filter.nothing()).limit(MAILBOX_PAGE_SIZE),
  );

  // The aggregate query already orders threads (by latest message) and their members (newest-first),
  // so entries map straight to stack items. Messages without a `threadId` share the aggregate's
  // single `null`-key group; split them back into singleton conversations at that group's position.
  // A thread's preview is capped at `MAILBOX_THREAD_PREVIEW_COUNT`; `count` carries the full size.
  const items = useMemo<MessageStackItem[]>(() => {
    const result: MessageStackItem[] = [];
    const selectedSystemTagIds = new Set(systemTagIds);
    for (const entry of pagination.items) {
      if (!isThreadGroup(entry)) {
        result.push(entry);
      } else if (entry.threadId == null) {
        result.push(...entry.items.map((message) => ({ id: message.id, messages: [message] })));
      } else {
        // Attach this mailbox's space-resident messages for the thread, skipping any already
        // matched by `source` — whether present in the (capped) preview or only in `count`.
        const presentIds = new Set(entry.items.map((message) => message.id));
        const spaceMessagesForThread = (spaceMessagesByThreadId.get(entry.threadId) ?? []).filter(
          (message) =>
            !presentIds.has(message.id) && !(isUnmodifiedSystemTagView && selectedSystemTagIds.has(message.id)),
        );
        const messages =
          spaceMessagesForThread.length > 0
            ? [...entry.items, ...spaceMessagesForThread].sort(sortByCreated('created', true))
            : entry.items;
        result.push({ id: entry.threadId, messages, total: entry.count + spaceMessagesForThread.length });
      }
    }
    // Drop messages excluded by the mailbox's filters (e.g. "Ignore sender"); collapse now-empty groups.
    // During an active search, also drop messages that don't match in their plain/markdown body or
    // subject — ECHO's full-text index covers the whole object (including raw HTML blocks), so a
    // message can match the index yet have no matching (or any) plain/markdown text to display.
    return applyPostFilters(result, mailbox, searchQuery);
    // systemTagIds is a fresh array each render; key on its membership (systemTagIdsKey) instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    pagination.items,
    spaceMessagesByThreadId,
    mailbox,
    mailbox.messageFilters,
    searchQuery,
    isUnmodifiedSystemTagView,
    systemTagIdsKey,
  ]);

  // Flat message list backing keyboard navigation and message-id lookups in action handlers.
  const messages = useMemo(() => items.flatMap((item) => (isMessageGroup(item) ? item.messages : [item])), [items]);

  // Gates on the query settling, not on `messages.length`, so the empty-mailbox panel never renders
  // mid-load. `source` is only undefined for a free-text view whose feed hasn't resolved yet.
  const loading = !source || pagination.isLoading;

  const handleClear = useCallback(() => {
    setFilterText(filterProp ?? '');
    setFilter(builder.build(filterProp ?? '').filter);
  }, [filterProp, builder]);

  const handleNavigate = useCallback(
    (messageId: string) => {
      const message = messages.find((m) => m.id === messageId);
      if (!message || !db) {
        return;
      }
      // Open the message's conversation as its own plank beside the mailbox (add), never a companion.
      // The conversation node lives under this mailbox view; `MessageArticle` renders the whole thread.
      void invokePromise(LayoutOperation.Select, { contextId: id, subject: { mode: 'single', id: message.id } });
      void invokePromise(LayoutOperation.Open, {
        subject: [`${id}/${message.id}`],
        pivotId: id,
        disposition: 'add',
        navigation: 'immediate',
      });
    },
    [db, id, messages, invokePromise],
  );

  useArticleKeyboardNavigation({ articleId: id, items: messages, currentId, onSelect: handleNavigate });

  const handleAction = useCallback<MessageStackActionHandler>(
    (action) => {
      switch (action.type) {
        // A message click ('current') and a conversation click ('current-conversation') both open the
        // one unified conversation (thread) view — a single message is just a one-message conversation —
        // as a standalone plank beside the mailbox.
        case 'current':
        case 'current-conversation': {
          const message = messages.find((message) => message.id === action.messageId);
          invariant(message);
          invariant(db);
          handleNavigate(message.id);
          break;
        }

        case 'star': {
          const message = messages.find((message) => message.id === action.messageId);
          if (message && db) {
            void Effect.runFork(
              SystemTags.toggleTag(mailbox, message, 'starred').pipe(Effect.provide(Database.layer(db))),
            );
          }
          break;
        }

        case 'ignore-sender': {
          const message = messages.find((message) => message.id === action.messageId);
          const email = message?.sender?.email;
          if (email && db) {
            Mailbox.ignoreSender(mailbox, email);
            void db.flush();
          }
          break;
        }

        case 'create-topic': {
          const message = messages.find((message) => message.id === action.messageId);
          if (message && db) {
            void invokePromise(
              InboxOperation.CreateTopicFromMessage,
              { mailbox: EchoRef.make(mailbox), message },
              { spaceId: db.spaceId },
            )
              .then((result) => {
                const topicId = result?.data?.topicId;
                if (topicId) {
                  void showItem({ contextId: id, selectionId: topicId, companion: linkedSegment('topic') });
                }
              })
              // Surface the failure instead of silently swallowing it (AI timeout / DB error).
              .catch((err) => log.catch(err));
          }
          break;
        }

        case 'select-tag': {
          setFilterText((prevFilterText) => {
            // Check if tag already exists.
            const tags = prevFilterText.split(/\s+/).filter(Boolean);
            if (tags.at(-1)?.toLowerCase() === '#' + action.label.toLowerCase()) {
              return prevFilterText;
            } else {
              return [prevFilterText.trim(), '#' + action.label].filter(Boolean).join(' ') + ' ';
            }
          });
          filterEditorRef.current?.focus();
          break;
        }

        case 'save': {
          void invokePromise(LayoutOperation.UpdatePopover, {
            subject: POPOVER_SAVE_FILTER,
            state: true,
            variant: 'virtual',
            anchor: filterSaveButtonRef.current,
            props: { mailbox, filter: action.filter },
          });
          break;
        }
      }
    },
    [db, id, mailbox, messages, invokePromise, showItem, handleNavigate],
  );

  const handleSaveFilter = useCallback(() => {
    if (filter) {
      handleAction({ type: 'save', filter: filterText });
    }
  }, [filter, filterText, handleAction]);

  // The search box is a toolbar item (custom-rendered) so the connect group can sit to its right.
  // Memoized so its reference (a menu-builder dep) only changes when the filter props do.
  const filterElement = useMemo(
    () => (
      <MailboxFilter
        db={db}
        tags={tagMap}
        value={filterText}
        filter={filter}
        onChange={setFilterText}
        onSave={handleSaveFilter}
        onClear={handleClear}
        editorRef={filterEditorRef}
        saveButtonRef={filterSaveButtonRef}
      />
    ),
    [db, tagMap, filterText, filter, setFilterText, handleSaveFilter, handleClear],
  );

  const menuActions = useMailboxActions(mailbox, {
    sortDescending,
    nodeId: id,
    filterElement,
    hideFilterEditor: systemTag === 'draft',
  });

  return (
    <Panel.Root>
      <ElevationProvider elevation='positioned'>
        <Menu.Root {...menuActions} onAction={runAction} attendableId={id}>
          <Panel.Toolbar asChild>
            <Menu.Toolbar />
          </Panel.Toolbar>
        </Menu.Root>
      </ElevationProvider>
      <Panel.Content asChild>
        {loading ? (
          // Fade-in delayed 1s so a fast load never flashes the spinner.
          <div className='grid place-items-center bs-full is-full'>
            <Icon
              icon='ph--spinner-gap--regular'
              size={6}
              classNames='text-subdued [animation:spin_1s_linear_infinite,fade-in_200ms_ease-out_1s_backwards]'
            />
          </div>
        ) : messages.length > 0 ? (
          <MessageStack
            id={id}
            items={items}
            currentId={currentId}
            tagsAtom={tagsAtom}
            starredAtom={starredAtom}
            pagination={pagination}
            enableIgnoreSender
            enableCreateTopic
            searchQuery={searchQuery}
            onAction={handleAction}
          />
        ) : (
          <InitializeMailbox mailbox={mailbox} />
        )}
      </Panel.Content>
      {progress && (progress.status === 'running' || progress.status === 'error') && (
        <Panel.Statusbar asChild>
          <ProgressMeter
            state={progress}
            classNames='border-t border-separator'
            onCancel={progressRegistry ? () => progressRegistry.cancel(progress.name) : undefined}
          />
        </Panel.Statusbar>
      )}
    </Panel.Root>
  );
};

MailboxArticle.displayName = 'MailboxArticle';

/** One thread's worth of results from the conversation-aggregated message query (see the query above). */
type ThreadGroup = {
  threadId: string | null | undefined;
  lastMessageAt: string | null;
  count: number;
  /** Capped preview (see `MAILBOX_THREAD_PREVIEW_COUNT`); `count` carries the full thread size. */
  items: Message.Message[];
};

// The aggregate query yields flat records, not entities; a real message is an Echo object, a thread
// group is a plain record. `Obj.instanceOf` is the seam between the two.
const isThreadGroup = (entry: Message.Message | ThreadGroup): entry is ThreadGroup =>
  !Obj.instanceOf(Message.Message, entry);

/**
 * Drops individually-filtered messages (e.g. "Ignore sender") and, during an active search, messages
 * whose visible body/subject don't match; collapses a group to nothing if every message is dropped.
 */
const applyPostFilters = (
  items: MessageStackItem[],
  mailbox: Mailbox.Mailbox,
  searchQuery: string | undefined,
): MessageStackItem[] => {
  const matches = (message: Message.Message) =>
    !Mailbox.isFiltered(mailbox, message) && (!searchQuery || messageMatchesQuery(message, searchQuery));
  return items.flatMap((item): MessageStackItem[] => {
    if (isMessageGroup(item)) {
      const messages = item.messages.filter(matches);
      return messages.length > 0 ? [{ ...item, messages }] : [];
    }
    return matches(item) ? [item] : [];
  });
};

const EMPTY_MESSAGE_TAGS_ATOM = Atom.make((): { id: string; label: string; hue?: string }[] => []);

/**
 * Per-message tag chip atom family over a TagIndex. Each atom yields resolved label/hue chips for one
 * message id and re-renders only when that message's tags (or tag registry labels) change.
 */
const useMessageTagsAtomFamily = (tagIndex: TagIndex.TagIndex | undefined, tagMap: Tag.Map): MessageTagsFamily =>
  useMemo(() => {
    if (!tagIndex) {
      return () => EMPTY_MESSAGE_TAGS_ATOM;
    }
    const urisFamily = TagIndex.atom(tagIndex);
    return Atom.family((messageId: EntityId) =>
      Atom.make((get) => {
        const uris = get(urisFamily(messageId));
        return uris.flatMap((uri) => {
          const tag = tagMap[uri];
          return tag ? [{ id: uri, label: tag.label, hue: tag.hue }] : [];
        });
      }),
    );
  }, [tagIndex, tagMap]);

/** A system tag's canonical object uri (its stable foreign key), or `undefined` before sync/creation. */
const useSystemTagUri = (
  db: Database.Database | undefined,
  tagId: SystemTags.SystemTagId | undefined,
): string | undefined => {
  const tagObj = useQuery(
    db,
    tagId ? Filter.foreignKeys(Tag.Tag, [SystemTags.systemTagKey(tagId)]) : Filter.nothing(),
  )[0];
  return tagObj && Obj.getURI(tagObj).toString();
};

const EMPTY_IDS_ATOM = Atom.make((): readonly EntityId[] => []);

/**
 * Reactive ids carrying `tagUri` in `tagIndex`. Feed/space messages have no `meta.tags` of their own —
 * membership lives in the mailbox's `TagIndex` sibling object instead, so a bare `Filter.tag` can't see it.
 */
const useTaggedIds = (tagIndex: TagIndex.TagIndex | undefined, tagUri: string | undefined): readonly EntityId[] => {
  const atom = useMemo(
    () => (tagIndex && tagUri ? TagIndex.taggedIdsAtom(tagIndex, tagUri) : EMPTY_IDS_ATOM),
    [tagIndex, tagUri],
  );
  return useAtomValue(atom);
};

/**
 * This mailbox's space-resident messages (drafts + not-yet-synced sent), by `threadId`. Scoped by
 * `DraftMessage.belongsTo` (`properties.mailbox`), not the 'draft' tag — a just-sent message is untagged
 * 'draft' immediately but should still attach to its thread until sync replaces it with the synced copy.
 * A threadless message (a fresh compose) is only ever shown on the Drafts view.
 */
const useSpaceMessagesByThreadId = (
  db: Database.Database | undefined,
  mailbox: Mailbox.Mailbox,
): Map<string, Message.Message[]> => {
  const mailboxUri = Obj.getURI(mailbox).toString();
  const messages = useQuery(db, Filter.type(Message.Message)).filter((message) =>
    DraftMessage.belongsTo(message, mailboxUri),
  );
  return useMemo(() => {
    const map = new Map<string, Message.Message[]>();
    for (const message of messages) {
      if (message.threadId == null) {
        continue;
      }
      const list = map.get(message.threadId);
      if (list) {
        list.push(message);
      } else {
        map.set(message.threadId, [message]);
      }
    }
    return map;
  }, [messages]);
};

type MailboxActionsOptions = {
  sortDescending: AtomState<boolean>;
  /** The mailbox's graph node id (the article's `attendableId`); contributed actions hang off it. */
  nodeId: string;
  /** Search box, custom-rendered as a toolbar item so the connect group can sit to its right. */
  filterElement: ReactNode;
  /** Hides the search box (Drafts): free text can't be safely scoped to just this mailbox's drafts. */
  hideFilterEditor: boolean;
};

const useMailboxActions = (
  mailbox: Mailbox.Mailbox,
  { sortDescending, nodeId, filterElement, hideFilterEditor }: MailboxActionsOptions,
) => {
  const { graph } = useAppGraph();
  const invoker = useOperationInvoker();
  const [settings, setSettings] = useAtomCapabilityState(InboxCapabilities.Settings);
  const loadRemoteImages = settings.loadRemoteImages ?? false;

  const handleCompose = useCallback(() => {
    const db = Obj.getDatabase(mailbox);
    invariant(db);
    void invoker.invokePromise(InboxOperation.DraftEmailAndOpen, { db, mailbox });
  }, [invoker, mailbox]);

  // Resolve capabilities here (in the container) and thread them into the presentation-only mailbox
  // action hooks — components (and the hooks they call) must not resolve capabilities themselves.
  const extractors = useCapabilities(InboxCapabilities.ObjectExtractor);
  const injectedActions = useCapabilities(InboxCapabilities.MailboxAction);
  const mailboxExtractorActions = useMailboxExtractorActions(mailbox, extractors, invoker);
  const mailboxActions = useInjectedMailboxActions(mailbox, injectedActions, invoker);
  const extractActions = [...mailboxExtractorActions, ...mailboxActions];

  return useMenuBuilder(
    (get) => {
      // `MenuBuilder` mutates in place, so conditional actions can be added without reassignment.
      const builder = MenuBuilder.make()
        .root({ label: ['mailbox-toolbar.title', { ns: meta.profile.key }] })
        .action(
          'sortAscending',
          {
            type: 'sortDescending',
            icon: sortDescending.value ? 'ph--sort-descending--regular' : 'ph--sort-ascending--regular',
            label: ['mailbox-toolbar-sort.menu', { ns: meta.profile.key }],
          },
          () => sortDescending.set((value) => !value),
        )
        .action(
          'loadRemoteImages',
          {
            type: 'loadRemoteImages',
            icon: loadRemoteImages ? 'ph--image--regular' : 'ph--image-broken--regular',
            label: ['message-toolbar-load-images.menu', { ns: meta.profile.key }],
            checked: loadRemoteImages,
          },
          () => setSettings((settings) => ({ ...settings, loadRemoteImages: !loadRemoteImages })),
        )
        .subgraph((builder) => {
          if (extractActions.length > 0) {
            return builder.group(
              'extract',
              {
                label: ['mailbox-toolbar-extract.menu', { ns: meta.profile.key }],
                icon: 'ph--magic-wand--regular',
                iconOnly: true,
                variant: 'dropdownMenu',
              },
              (group) => {
                for (const item of extractActions) {
                  group.action(`extract-${item.id}`, { label: item.label }, item.onSelect);
                }
              },
            );
          }
        })
        .action(
          'composeEmail',
          {
            type: 'composeEmail',
            icon: 'ph--pen--regular',
            label: ['compose-email.label', { ns: meta.profile.key }],
          },
          handleCompose,
        );

      // The search box, custom-rendered as a toolbar item so the connect group can sit to its right.
      // Always present (even for an empty mailbox — filtering an empty list is harmless) except in the
      // Drafts view (see `hideFilterEditor`'s docstring).
      if (!hideFilterEditor) {
        builder.action(
          'filter',
          {
            variant: 'custom',
            label: ['mailbox-toolbar.title', { ns: meta.profile.key }],
            render: () => filterElement,
          },
          () => {},
        );
      }

      return builder
        .separator('gap')
        .subgraph(graphActions(graph, get, nodeId, { filter: isToolbarAction, surface: TOOLBAR_DISPOSITION }))
        .build();
    },
    [
      graph,
      nodeId,
      filterElement,
      hideFilterEditor,
      sortDescending,
      loadRemoteImages,
      setSettings,
      handleCompose,
      mailboxExtractorActions,
      mailboxActions,
    ],
  );
};

/**
 * Return map of tags;
 */
// TODO(burdon): Factor out.
// Tag registry keyed by the Tag object's URI — the id space used by meta.tags, the Mailbox tag
// index, and the QueryBuilder's `tag:` filter.
const useTags = (db: Database.Database | undefined): Tag.Map => {
  const tags = useQuery(db, Filter.type(Tag.Tag));
  return useMemo(
    () =>
      tags.reduce<Tag.Map>((acc, tag) => {
        acc[Obj.getURI(tag).toString()] = tag;
        return acc;
      }, {}),
    [tags],
  );
};
