//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import React, { type ReactNode, useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';

import {
  useAtomCapability,
  useAtomCapabilityState,
  useOperationInvoker,
  useOptionalCapability,
} from '@dxos/app-framework/ui';
import { AppCapabilities, LayoutOperation } from '@dxos/app-toolkit';
import { type AppSurface, ProgressMeter, useAppGraph, useProgress, useShowItem } from '@dxos/app-toolkit/ui';
import { Aggregate, type Database, Ref as EchoRef, Filter, Obj, Order, Query, Tag } from '@dxos/echo';
import { QueryBuilder } from '@dxos/echo-query';
import { usePagination, useQuery, useResolveRef } from '@dxos/echo-react';
import { invariant } from '@dxos/invariant';
import { type EntityId } from '@dxos/keys';
import { log } from '@dxos/log';
import { useActionRunner } from '@dxos/plugin-graph';
import { AtomState, useAtomState } from '@dxos/react-hooks';
import { ElevationProvider, Icon, Panel, useTranslation } from '@dxos/react-ui';
import { linkedSegment, useArticleKeyboardNavigation, useSelection } from '@dxos/react-ui-attention';
import { type EditorController } from '@dxos/react-ui-editor';
import { Empty } from '@dxos/react-ui-list';
import {
  Menu,
  MenuBuilder,
  TOOLBAR_DISPOSITION,
  graphActions,
  isToolbarAction,
  useMenuBuilder,
} from '@dxos/react-ui-menu';
import { TagIndex } from '@dxos/schema';
import { Message } from '@dxos/types';

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
import { createTopicsProgressKey } from '../../operations/analyze/analyze-topics';
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
     * A canonical system tag (see `SystemTags.SystemTag`) this view resolves by identity rather than by
     * parsing `filter` as a tag-label string — used by the pre-seeded Inbox/Sent/Drafts views so they
     * stay correct regardless of a tag's label text (and, for Inbox/Sent, across providers/locales).
     * `filter` still seeds the editable filter box (e.g. `'#inbox'`) for display and further narrowing;
     * once the user edits it away from that seed, the box's own text/tag parsing takes over as normal.
     * The Drafts view (`systemTag === 'draft'`) queries the space db instead of the feed and hides the
     * filter box entirely (see `isDraftsView` below) rather than support that fallback.
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
  // Drafts is a systemTag view like Inbox/Sent, but its messages live in the space db, not the feed,
  // and (see `useMailboxActions` below) it has no free-text filter box.
  const isDraftsView = systemTag === 'draft';
  const { t } = useTranslation(meta.profile.key);
  const { invokePromise } = useOperationInvoker();
  const settings = useAtomCapability(InboxCapabilities.Settings);
  const id = attendableId ?? Obj.getURI(mailbox);
  const currentId = useSelection(id, 'single');
  const db = Obj.getDatabase(mailbox);
  const showItem = useShowItem();
  const runAction = useActionRunner();

  // Mailbox-scoped operations register a monitor keyed by the mailbox URI (`#sync` for Gmail sync,
  // `#topics` for topic analysis); subscribe to both and show whichever run is active in the statusbar.
  const syncProgress = useProgress(createSyncProgressKey(mailbox));
  const topicsProgress = useProgress(createTopicsProgressKey(mailbox));
  const progress =
    topicsProgress?.status === 'running' || topicsProgress?.status === 'error' ? topicsProgress : syncProgress;
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
  const starredTag = useQuery(db, Filter.foreignKeys(Tag.Tag, [SystemTags.systemTagKey('starred')]))[0];
  const starredUri = starredTag && Obj.getURI(starredTag).toString();
  const starredAtom = useMemo(() => SystemTags.tagAtom(tagIndex, starredUri), [tagIndex, starredUri]);

  // Resolves this view's canonical system tag (e.g. Inbox/Sent/Draft) by its stable foreign key, not by
  // label text (see `buildSystemTagSelection`) — `undefined` until the provider sync (or, for `draft`,
  // the first locally-created draft) has created it.
  const systemTagObj = useQuery(
    db,
    systemTag ? Filter.foreignKeys(Tag.Tag, [SystemTags.systemTagKey(systemTag)]) : Filter.nothing(),
  )[0];
  const systemTagUri = systemTagObj && Obj.getURI(systemTagObj).toString();
  // This mailbox's currently-open drafts are resolved by the canonical 'draft' tag too — removed by
  // `useSendEmail` the instant a draft sends, well before the sync-side `db.remove` that later deletes
  // the object. Needed on every view, not just the Drafts view: a draft reply is attached to its thread
  // wherever that thread is already shown (see the `items` memo). Resolved separately from `systemTag`
  // above (even though they're the same tag when `isDraftsView`) since this one is always active.
  const draftTagObj = useQuery(db, Filter.foreignKeys(Tag.Tag, [SystemTags.systemTagKey('draft')]))[0];
  const draftTagUri = draftTagObj && Obj.getURI(draftTagObj).toString();
  // A bare `Filter.tag` query can't see either tag: feed/space messages carry no `meta.tags` of their
  // own here — membership lives entirely in the mailbox's `TagIndex` sibling object. Resolve to
  // concrete ids instead. The index mutates in place, which `useResolveRef` doesn't observe, so
  // subscribe to it directly and force a recompute on change (mirrors `CalendarArticle`'s starred marks).
  const [, bumpTagIds] = useReducer((tick: number) => tick + 1, 0);
  useEffect(() => (tagIndex ? Obj.subscribe(tagIndex, bumpTagIds) : undefined), [tagIndex]);
  const systemTagIds = systemTagUri && tagIndex ? TagIndex.bind(tagIndex).objects(systemTagUri) : [];
  const draftIds = draftTagUri && tagIndex ? TagIndex.bind(tagIndex).objects(draftTagUri) : [];

  // This mailbox's currently-open drafts, as live objects (space-db, not the feed) — already excludes
  // sent drafts (untagged at send time, see above), so no further supersession check is needed here.
  // Outside the Drafts view, each is attached to its thread if that thread is already present in the
  // list below; a draft never appears as a standalone row anywhere else (see the `items` memo). The
  // Drafts view itself doesn't use this — it's driven by the same tag-scoped `source` as any other
  // systemTag view (see `selection` below).
  const drafts = useQuery(db, buildSystemTagSelection(draftIds));
  const draftsByThreadId = useMemo(() => {
    const map = new Map<string, Message.Message[]>();
    for (const draft of drafts) {
      if (draft.threadId == null) {
        continue;
      }
      const list = map.get(draft.threadId);
      if (list) {
        list.push(draft);
      } else {
        map.set(draft.threadId, [draft]);
      }
    }
    return map;
  }, [drafts]);

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
  //
  // A system-tag view (Inbox/Sent/Drafts) resolves by tag identity while the filter box sits at its
  // seeded text (e.g. unedited `'#inbox'`) — robust regardless of a tag's label text and immune to a
  // same-named user tag. Once the user edits the box away from that seed, the usual text/tag DSL parse
  // takes over — except on the Drafts view, whose filter box is hidden entirely (see `useMailboxActions`
  // below), so it always takes this branch.
  const isUnmodifiedSystemTagView = systemTag !== undefined && debouncedFilterText === (filterProp ?? '');
  const systemTagIdsKey = systemTagIds.join(',');
  const selection = useMemo(
    () =>
      isUnmodifiedSystemTagView
        ? buildSystemTagSelection(systemTagIds)
        : buildMailboxSelection(debouncedFilterText, debouncedFilter),
    // `systemTagIds` is a fresh array each render; key the memo on its membership (`systemTagIdsKey`) instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isUnmodifiedSystemTagView, systemTagIdsKey, debouncedFilterText, debouncedFilter],
  );
  const searchQuery = useMemo(() => getSearchText(debouncedFilter), [debouncedFilter]);
  // Every other view queries the feed; Drafts queries the space db instead (drafts live there), via the
  // exact same tag-scoped selection/aggregate/pagination pipeline — no separate data path needed.
  const source = isDraftsView ? Query.select(selection) : feed ? Query.select(selection).from(feed) : undefined;
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
    for (const entry of pagination.items) {
      if (!isThreadGroup(entry)) {
        result.push(entry);
      } else if (entry.threadId == null) {
        result.push(...entry.items.map((message) => ({ id: message.id, messages: [message] })));
      } else {
        // Attach this mailbox's still-open drafts for the thread, if any — already excludes sent drafts
        // (untagged the instant they send), so no supersession check is needed here. Skipped on the
        // Drafts view itself: its own aggregate entries already ARE those drafts.
        const draftsForThread = isDraftsView ? [] : (draftsByThreadId.get(entry.threadId) ?? []);
        const messages =
          draftsForThread.length > 0
            ? [...entry.items, ...draftsForThread].sort(sortByCreated('created', true))
            : entry.items;
        result.push({ id: entry.threadId, messages, total: entry.count + draftsForThread.length });
      }
    }
    // Drop messages excluded by the mailbox's filters (e.g. "Ignore sender"); collapse now-empty groups.
    // During an active search, also drop messages that don't match in their plain/markdown body or
    // subject — ECHO's full-text index covers the whole object (including raw HTML blocks), so a
    // message can match the index yet have no matching (or any) plain/markdown text to display.
    return applyPostFilters(result, mailbox, searchQuery);
  }, [pagination.items, isDraftsView, draftsByThreadId, mailbox, mailbox.messageFilters, searchQuery]);

  // Flat message list backing keyboard navigation and message-id lookups in action handlers.
  const messages = useMemo(() => items.flatMap((item) => (isMessageGroup(item) ? item.messages : [item])), [items]);

  // Gates on the query settling, not on `messages.length`, so the empty-mailbox panel never renders
  // mid-load. `source` is only undefined for a non-Drafts view whose feed hasn't resolved yet.
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
      // Open the message companion; `MessageArticle` renders the selected message's whole conversation.
      void showItem({ contextId: id, selectionId: message.id, companion: linkedSegment('message') });
    },
    [db, id, messages, showItem],
  );

  useArticleKeyboardNavigation({ articleId: id, items: messages, currentId, onSelect: handleNavigate });

  const handleAction = useCallback<MessageStackActionHandler>(
    (action) => {
      switch (action.type) {
        // A message click ('current') and a conversation click ('current-conversation') both open the
        // one unified conversation (thread) view — a single message is just a one-message conversation.
        // Selecting the message opens the message companion, which renders the whole conversation.
        case 'current':
        case 'current-conversation': {
          const message = messages.find((message) => message.id === action.messageId);
          invariant(message);
          invariant(db);
          void showItem({ contextId: id, selectionId: message.id, companion: linkedSegment('message') });
          break;
        }

        case 'star': {
          const message = messages.find((message) => message.id === action.messageId);
          if (message && db) {
            void SystemTags.toggleTag(mailbox, message, db, 'starred');
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
    [db, id, mailbox, messages, invokePromise, showItem],
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
    hideFilterEditor: isDraftsView,
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
        ) : isDraftsView ? (
          <Empty label={t('drafts.empty.message')} />
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

type MailboxActionsOptions = {
  sortDescending: AtomState<boolean>;
  /** The mailbox's graph node id (the article's `attendableId`); contributed actions hang off it. */
  nodeId: string;
  /** Search box, custom-rendered as a toolbar item so the connect group can sit to its right. */
  filterElement: ReactNode;
  /**
   * Hides the search box (the Drafts view). A free-text search can't be safely scoped to just this
   * mailbox's drafts once it drops to a lone full-text select over the whole space (the query engine
   * can't AND a mailbox-scope constraint onto it — same "too complex" limit `buildMailboxSelection`
   * already works around for the feed), so the Drafts view doesn't offer one.
   */
  hideFilterEditor: boolean;
};

const useMailboxActions = (
  mailbox: Mailbox.Mailbox,
  { sortDescending, nodeId, filterElement, hideFilterEditor }: MailboxActionsOptions,
) => {
  const { graph } = useAppGraph();
  const { invokePromise } = useOperationInvoker();
  const [settings, setSettings] = useAtomCapabilityState(InboxCapabilities.Settings);
  const loadRemoteImages = settings.loadRemoteImages ?? false;

  const handleCompose = useCallback(() => {
    const db = Obj.getDatabase(mailbox);
    invariant(db);
    void invokePromise(InboxOperation.DraftEmailAndOpen, { db, mailbox });
  }, [invokePromise, mailbox]);

  const mailboxExtractorActions = useMailboxExtractorActions(mailbox);
  const mailboxActions = useInjectedMailboxActions(mailbox);
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
          'loadImages',
          {
            type: 'loadImages',
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
