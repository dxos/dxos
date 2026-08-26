//
// Copyright 2025 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Effect from 'effect/Effect';
import * as Atom from 'effect/unstable/reactivity/Atom';
import React, { type ReactNode, useCallback, useMemo, useRef, useState } from 'react';

import {
  useAtomCapability,
  useAtomCapabilityState,
  useCapabilities,
  useOperationInvoker,
  useOptionalCapability,
} from '@dxos/app-framework/ui';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { type AppSurface, useAppGraph, useProgressMonitor, useShowItem } from '@dxos/app-toolkit/ui';
import { Aggregate, Database, Ref as EchoRef, Filter, Obj, Order, Query, Scope, Tag } from '@dxos/echo';
import { QueryBuilder } from '@dxos/echo-query';
import { usePagination, useQuery, useResolveRef } from '@dxos/echo-react';
import { invariant } from '@dxos/invariant';
import { type EntityId } from '@dxos/keys';
import { log } from '@dxos/log';
import { useActionRunner } from '@dxos/plugin-graph/hooks';
import { AtomState, useAtomState } from '@dxos/react-hooks';
import { Deferred, ElevationProvider, Panel } from '@dxos/react-ui';
import { Attention, useArticleKeyboardNavigation, useSelection } from '@dxos/react-ui-attention';
import { ProgressMeter } from '@dxos/react-ui-components';
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
  InboxStack,
  type InboxStackActionHandler,
  type InboxStackItem,
  type MessageTagsFamily,
  isMessageGroup,
} from '#components';
import { useDebouncedValue, useInjectedMailboxActions, useMailboxExtractorActions } from '#hooks';
import { meta } from '#meta';
import { createSyncProgressKey } from '#sync';
import { InboxCapabilities, InboxOperation, Mailbox, SystemTags } from '#types';

import { POPOVER_SAVE_FILTER } from '../../constants';
import { messageMatchesQuery } from '../../util';
import { InitializeMailbox } from './InitializeMailbox';
import {
  buildMailboxSelection,
  buildSystemTagSelection,
  buildThreadSemiJoin,
  getFilterTagUris,
  getSearchText,
} from './mailbox-search';
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

  // Mail sync (`#sync`), the process pipeline (`#process`) and the analyze cascade (`#analyze`)
  // register monitors keyed by the mailbox URI; the statusbar shows whichever run is active, sync
  // first — it is the one that changes what the list contains rather than what is known about it.
  const syncProgress = useProgressMonitor(createSyncProgressKey(mailbox));
  const scanProgress = useProgressMonitor(InboxOperation.createAnalyzeProgressKey(mailbox));
  const isActive = (state: typeof syncProgress) => state?.status === 'running' || state?.status === 'error';
  const progress = [syncProgress, scanProgress].find(isActive);
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

  // Inbox membership drives the tile menu's archive direction; archiving is this tag coming off.
  const inboxUri = useSystemTagUri(db, 'inbox');
  const inboxAtom = useMemo(() => SystemTags.tagAtom(tagIndex, inboxUri), [tagIndex, inboxUri]);

  // This view's canonical system tag, resolved by id (`undefined` until sync/first draft creates it).
  const systemTagUri = useSystemTagUri(db, systemTag);
  const systemTagIds = useTaggedIds(tagIndex, systemTagUri);

  // Filter.
  const builder = useMemo(() => new QueryBuilder(tagMap), [tagMap]);
  const [filterText, setFilterText] = useState<string>(filterProp ?? '');
  // Supplied by the query editor, which already parses the DSL to decorate it — deriving the filter
  // here as well parsed every keystroke twice. `builder` remains for the seeds below, which are set
  // programmatically and so produce no editor event.
  const [filter, setFilter] = useState<Filter.Any | undefined>(() => builder.build(filterProp ?? '').filter);

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

  // Read reactively so a text search scoped to a tag's members (see `buildMailboxSelection`)
  // re-runs when that tag's membership changes.
  const filterTagUris = useMemo(() => getFilterTagUris(debouncedFilter), [debouncedFilter]);
  const filterTagUrisKey = filterTagUris.join(',');
  const filterTagIdsAtom = useMemo(
    () =>
      tagIndex && filterTagUris.length > 0
        ? Atom.make((get) =>
            filterTagUris.map((tagUri) => [tagUri, get(TagIndex.taggedIdsAtom(tagIndex, tagUri))] as const),
          )
        : EMPTY_TAG_IDS_ATOM,
    // filterTagUris is a fresh array each render; key on its membership (filterTagUrisKey) instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tagIndex, filterTagUrisKey],
  );
  const filterTagIds = useAtomValue(filterTagIdsAtom);
  const resolveTagIds = useCallback(
    (tagUri: string) => filterTagIds.find(([uri]) => uri === tagUri)?.[1],
    [filterTagIds],
  );

  // True while the filter box still shows its seeded text (`'#inbox'` etc.) unedited, so the tag-id
  // selection applies; editing away falls back to normal text/tag parsing (Drafts hides the box).
  const isUnmodifiedSystemTagView = systemTag !== undefined && debouncedFilterText === (filterProp ?? '');
  const systemTagIdsKey = systemTagIds.join(',');
  const selection = useMemo(
    () =>
      isUnmodifiedSystemTagView
        ? buildSystemTagSelection(systemTagIds)
        : buildMailboxSelection(debouncedFilterText, debouncedFilter, { resolveTagIds }),
    // systemTagIds is a fresh array each render; key on its membership (systemTagIdsKey) instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isUnmodifiedSystemTagView, systemTagIdsKey, debouncedFilterText, debouncedFilter, resolveTagIds],
  );
  const searchQuery = useMemo(() => getSearchText(debouncedFilter), [debouncedFilter]);

  // A thread qualifies if any of its messages match `selection`, and `buildThreadSemiJoin` then
  // selects every message sharing that thread's `threadId` — across the feed and this space
  // (drafts) — so `count`/`items` reflect the whole thread rather than only its filter-matching
  // members. Inbox/Sent/Drafts ids may resolve on either side, so that view's own matches scope is
  // the same feed+space scope as the outer query; free text stays feed-only for matching (too
  // complex to scope across the whole space — see `hideFilterEditor`), even though the outer,
  // thread-pulling scope still spans both. The space side can surface another mailbox's draft that
  // happens to share a `threadId` (thread ids are effectively globally unique, so this is rare) —
  // `reconcileDrafts` below re-scopes drafts to this mailbox and drops ones already superseded by
  // their synced copy. Either view degrades to space-only while `feed` is still resolving; free
  // text has nothing to match yet without a feed.
  const feedUri = feed && Obj.getURI(feed, { prefer: 'absolute' });
  const scopes = feedUri
    ? [Scope.feed(feedUri), Scope.space()]
    : isUnmodifiedSystemTagView
      ? [Scope.space()]
      : undefined;
  const matchesScope = isUnmodifiedSystemTagView ? scopes : feedUri ? [Scope.feed(feedUri)] : undefined;
  const source = scopes && matchesScope ? buildThreadSemiJoin(selection, matchesScope).from(scopes) : undefined;
  const pagination = usePagination(
    db,
    source
      ? conversations
        ? source
            .aggregate({
              // Falling back to the message id keeps every threadless message (drafts,
              // transcriptions, assistant-authored) its own conversation; grouping on `threadId`
              // alone pools them all under the `null` key, where `items`' preview cap would silently
              // drop all but the first few.
              threadId: Aggregate.group({ coalesce: ['threadId', 'id'] }),
              lastMessageAt: Aggregate.max('created'),
              count: Aggregate.count(),
              items: Aggregate.items({
                limit: MAILBOX_THREAD_PREVIEW_COUNT,
                order: [Order.property('created', 'desc')],
              }),
            })
            .orderBy(Order.property('lastMessageAt', direction))
            .limit(MAILBOX_PAGE_SIZE)
        : source.orderBy(Order.property('created', direction)).limit(MAILBOX_PAGE_SIZE)
      : Query.select(Filter.nothing()).limit(MAILBOX_PAGE_SIZE),
  );

  // The aggregate query already orders threads (by latest message) and their members (newest-first),
  // and its group key falls back to the message id, so a threadless message arrives as its own
  // one-member group — entries map straight to stack items. A thread's preview is capped at
  // `MAILBOX_THREAD_PREVIEW_COUNT`; `count` carries the full size.
  const items = useMemo<InboxStackItem[]>(() => {
    const result: InboxStackItem[] = [];
    for (const entry of pagination.items) {
      if (isThreadGroup(entry)) {
        result.push({ id: entry.threadId, messages: entry.items, total: entry.count });
      } else {
        result.push(entry);
      }
    }
    return applyPostFilters(result, mailbox, searchQuery);
  }, [pagination.items, mailbox, mailbox.messageFilters, searchQuery]);

  // Flat message list backing keyboard navigation and message-id lookups in action handlers.
  const messages = useMemo(() => items.flatMap((item) => (isMessageGroup(item) ? item.messages : [item])), [items]);

  // Drives an in-flow spinner in the list, never a full-panel fallback — a page fetch or a
  // background refresh must not blank the list. `source` is undefined until a free-text feed resolves.
  //
  // Deliberately NOT widened to cover the feed's own resolution: a system-tag view degrades to a
  // space-only scope while `mailbox.feed` loads, which answers immediately with nothing (measured on
  // a live profile: 0 messages space-only vs 432 feed-scoped) — but spinning through that window
  // just trades a flash of the empty panel for a flash of the spinner. The `Deferred` below holds
  // the panel back instead, which costs no visible state at all.
  const loading = !source || pagination.isLoading;
  // Show the empty-mailbox panel only once the query has settled with nothing, never mid-load.
  const showEmptyState = !loading && messages.length === 0;

  // Text set from here rather than typed reaches the editor imperatively — a controlled `value` would
  // race fast typing — and raises no editor event, so the parse the editor normally hands back has to
  // be done here too, or `filter` (which gates Save) keeps describing the previous text.
  const applyFilterText = useCallback(
    (text: string) => {
      setFilterText(text);
      setFilter(builder.build(text).filter);
      filterEditorRef.current?.setText(text);
    },
    [builder],
  );

  // Read by `select-tag`, which appends to the current text from a handler that must not be rebuilt
  // on every keystroke.
  const filterTextRef = useRef(filterText);
  filterTextRef.current = filterText;

  const handleClear = useCallback(() => applyFilterText(filterProp ?? ''), [filterProp, applyFilterText]);

  const handleNavigate = useCallback(
    (messageId: string, newPlank = false) => {
      const message = messages.find((m) => m.id === messageId);
      if (!message || !db) {
        return;
      }
      // Open the message's conversation as its own plank beside the mailbox (add), never a companion.
      // The conversation node lives under this mailbox view; `MessageArticle` renders the whole thread.
      // Ordinarily `level` names the rung in the mailbox's declared chain, so reading down the mailbox
      // reuses one plank; meta/ctrl click asks for a plank of its own, so it opens without a level and
      // keeps whatever is already there.
      void invokePromise(LayoutOperation.Select, { contextId: id, subject: { mode: 'single', id: message.id } });
      void invokePromise(LayoutOperation.Open, {
        subject: [`${id}/${message.id}`],
        ...(newPlank ? {} : { root: id, level: 'message' }),
        pivotId: id,
        disposition: 'add',
        navigation: 'immediate',
      });
    },
    [db, id, messages, invokePromise],
  );

  useArticleKeyboardNavigation({ articleId: id, items: messages, currentId, onSelect: handleNavigate });

  const handleAction = useCallback<InboxStackActionHandler>(
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
          handleNavigate(message.id, action.type === 'current' && action.newPlank);
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

        case 'archive': {
          const message = messages.find((message) => message.id === action.messageId);
          if (message && db) {
            void Effect.runFork(
              SystemTags.toggleTag(mailbox, message, 'inbox').pipe(Effect.provide(Database.layer(db))),
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
              InboxOperation.CreateProjectFromMessage,
              { mailbox: EchoRef.make(mailbox), message },
              { spaceId: db.spaceId },
            )
              .then((result) => {
                const projectId = result?.data?.projectId;
                if (projectId) {
                  void showItem({
                    contextId: id,
                    selectionId: projectId,
                    companion: Attention.linkedSegment('topic'),
                  });
                }
              })
              // Surface the failure instead of silently swallowing it (AI timeout / DB error).
              .catch((err) => log.catch(err));
          }
          break;
        }

        case 'select-tag': {
          const previous = filterTextRef.current;
          // Check if tag already exists.
          const tags = previous.split(/\s+/).filter(Boolean);
          if (tags.at(-1)?.toLowerCase() !== '#' + action.label.toLowerCase()) {
            applyFilterText([previous.trim(), '#' + action.label].filter(Boolean).join(' ') + ' ');
          }
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
    [db, id, mailbox, messages, invokePromise, showItem, handleNavigate, applyFilterText],
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
        onFilterChange={setFilter}
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
    <Panel.Root data-testid='inbox.mailbox'>
      <ElevationProvider elevation='positioned'>
        <Menu.Root {...menuActions} onAction={runAction} attendableId={id}>
          <Panel.Toolbar asChild>
            <Menu.Toolbar>
              <Menu.Items />
            </Menu.Toolbar>
          </Panel.Toolbar>
        </Menu.Root>
      </ElevationProvider>
      <Panel.Content>
        <Deferred pending={showEmptyState} fallback={() => <InitializeMailbox mailbox={mailbox} />}>
          <InboxStack
            id={id}
            items={items}
            currentId={currentId}
            tagsAtom={tagsAtom}
            starredAtom={starredAtom}
            inboxAtom={inboxAtom}
            pagination={pagination}
            loading={loading}
            enableArchive
            enableIgnoreSender
            enableCreateTopic
            searchQuery={searchQuery}
            onAction={handleAction}
          />
        </Deferred>
      </Panel.Content>
      <Panel.Statusbar asChild>
        <ProgressMeter
          classNames='border-t border-subdued-separator'
          state={progress?.status === 'running' || progress?.status === 'error' ? progress : undefined}
          onCancel={progressRegistry ? () => progress && progressRegistry.cancel(progress.name) : undefined}
        />
      </Panel.Statusbar>
    </Panel.Root>
  );
};

MailboxArticle.displayName = 'MailboxArticle';

/** One thread's worth of results from the conversation-aggregated message query (see the query above). */
type ThreadGroup = {
  /** The thread's id, or the message's own id for a message that carries no `threadId`. */
  threadId: string;
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
 * Synced messages (no `properties.mailbox`) always pass; drafts pass only when they belong to this
 * mailbox and aren't yet superseded by their sent copy (matched on the provider id set at send
 * time). Mirrors the reconciliation in `app-graph-builder.ts`'s `mailboxMessage` connector — the
 * whole-thread semi-join's space scope can pull in another mailbox's draft sharing a `threadId`, or
 * a draft whose sent copy has already synced into the feed.
 */
const reconcileDrafts = (messages: Message.Message[], mailboxUri: string): Message.Message[] => {
  const syncedIds = new Set(
    messages
      .filter((message) => !DraftMessage.instanceOf(message))
      .flatMap((message) => Obj.getMeta(message).keys.map((key) => key.id)),
  );
  return messages.filter((message) => {
    if (!DraftMessage.instanceOf(message)) {
      return true;
    }
    if (!DraftMessage.belongsTo(message, mailboxUri)) {
      return false;
    }
    return !(message.properties?.sentMessageId && syncedIds.has(message.properties.sentMessageId));
  });
};

/**
 * For each thread group, first reconciles its drafts (see {@link reconcileDrafts}), then drops
 * individually-filtered messages (e.g. "Ignore sender") and, during an active search, messages
 * whose visible body/subject don't match; collapses a group to nothing if every message is dropped.
 */
const applyPostFilters = (
  items: InboxStackItem[],
  mailbox: Mailbox.Mailbox,
  searchQuery: string | undefined,
): InboxStackItem[] => {
  const mailboxUri = Obj.getURI(mailbox).toString();
  const matches = (message: Message.Message) =>
    !Mailbox.isFiltered(mailbox, message) && (!searchQuery || messageMatchesQuery(message, searchQuery));
  return items.flatMap((item): InboxStackItem[] => {
    if (isMessageGroup(item)) {
      const messages = reconcileDrafts(item.messages, mailboxUri).filter(matches);
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
const EMPTY_TAG_IDS_ATOM = Atom.make((): readonly (readonly [string, readonly EntityId[]])[] => []);

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
    // `nodeId` is this view's node, so the draft opens as a plank beside it rather than beside Drafts.
    void invoker.invokePromise(InboxOperation.DraftEmailAndOpen, { db, mailbox, contextId: nodeId });
  }, [invoker, mailbox, nodeId]);

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
