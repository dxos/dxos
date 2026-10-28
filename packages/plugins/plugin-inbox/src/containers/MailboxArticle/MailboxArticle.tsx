//
// Copyright 2025 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Effect from 'effect/Effect';
import * as Atom from 'effect/reactivity/Atom';
import React, { type ReactNode, useCallback, useMemo } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as ToolkitHooks from '@dxos/app-toolkit/Hooks';
import { Aggregate, Database, Ref as EchoRef, Filter, Obj, Order, Query, Scope, Tag } from '@dxos/echo';
import { formatTag } from '@dxos/echo-query';
import { usePagination, useQuery, useResolveRef } from '@dxos/echo-react';
import { invariant } from '@dxos/invariant';
import { type EntityId } from '@dxos/keys';
import { log } from '@dxos/log';
import * as GraphHooks from '@dxos/plugin-graph/Hooks';
import { AtomState, useAtomState } from '@dxos/react-hooks';
import { Attention, useArticleKeyboardNavigation, useSelection } from '@dxos/react-ui-attention';
import { ProgressMeter } from '@dxos/react-ui-components';
import {
  ActionToolbar,
  MenuBuilder,
  TOOLBAR_DISPOSITION,
  TOOLBAR_OVERFLOW_ID,
  graphActions,
  isToolbarAction,
  useMenuBuilder,
} from '@dxos/react-ui-menu';
import * as Panel from '@dxos/react-ui/Panel';
import * as Status from '@dxos/react-ui/Status';
import { TagIndex } from '@dxos/schema';
import { DraftMessage, Message } from '@dxos/types';

import {
  InboxStack,
  type InboxStackActionHandler,
  type InboxStackItem,
  type InboxStackSection,
  type MessageTagsFamily,
  isMessageGroup,
} from '#components';
import {
  useFilterTagIds,
  useInjectedMailboxActions,
  useMailboxExtractorActions,
  useQueryFilter,
  useTagMap,
} from '#hooks';
import { meta } from '#meta';
import { createSyncProgressKey } from '#sync';
import { InboxCapabilities, InboxOperation, Mailbox, SystemTags } from '#types';

import { MAILBOX_MENU_DISPOSITION } from '../../constants.ts';
import { getFeedObjectPath, getMailboxPath } from '../../paths.ts';
import { buildSearchSelection, getSearchText, messageMatchesQuery } from '../../util/index.ts';
import { InitializeMailbox } from './InitializeMailbox.tsx';
import { buildSystemTagSelection, buildThreadSemiJoin } from './mailbox-search.ts';

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
  const { invokePromise } = Hooks.useOperationInvoker();
  const settings = Hooks.useAtomCapability(InboxCapabilities.Settings);
  const db = Obj.getDatabase(mailbox);
  // The mailbox view's graph node id: messages open as its children and it roots their level chain.
  const id = attendableId ?? (db ? getMailboxPath(db.spaceId, mailbox.id) : Obj.getURI(mailbox));
  const currentId = useSelection(id, 'single');
  const showItem = ToolkitHooks.useShowItem();
  const runAction = GraphHooks.useActionRunner();

  // Mail sync (`#sync`), the analyze cascade (`#analyze`), Triage inbox (`#triage`) and a message's extraction (`#extract`)
  // register monitors keyed by the mailbox URI; the statusbar shows whichever run is active, sync
  // first — it is the one that changes what the list contains rather than what is known about it.
  const syncProgress = ToolkitHooks.useProgressMonitor(createSyncProgressKey(mailbox));
  const scanProgress = ToolkitHooks.useProgressMonitor(InboxOperation.createAnalyzeProgressKey(mailbox));
  const triageProgress = ToolkitHooks.useProgressMonitor(InboxOperation.createTriageProgressKey(mailbox));
  const extractProgress = ToolkitHooks.useProgressMonitor(InboxOperation.createExtractProgressKey(mailbox));
  const isActive = (state: typeof syncProgress) => state?.status === 'running' || state?.status === 'error';
  const progress = [syncProgress, scanProgress, triageProgress, extractProgress].find(isActive);
  // Registry (present when plugin-progress is loaded) lets the meter cancel a cancellable run.
  const progressRegistry = Hooks.useOptionalCapability(AppCapabilities.ProgressRegistry);

  // Menu state.
  const sortDescending = useAtomState(true);

  const tagMap = useTagMap(db);
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
  const {
    textRef: filterTextRef,
    debouncedText: debouncedFilterText,
    debouncedFilter,
    applyText: applyFilterText,
    editorRef: filterEditorRef,
    element: filterElement,
  } = useQueryFilter({ owner: mailbox, tags: tagMap, initialText: filterProp });

  // Whether messages are grouped into conversations (threads). On by default.
  const conversations = settings.conversations ?? true;
  const direction = sortDescending.value ? 'desc' : 'asc';

  // Order by message `created` (not feed insertion order): a backward/backfill sync appends out of
  // date order. The mailbox reads and sorts/groups the whole feed client-side; `usePagination` and
  // the virtualizer bound only what's rendered, not what's fetched. Bounded-memory windowing isn't
  // possible here — ordering threads by a `max(created)` aggregate needs the full set to rank them.

  // Read reactively so a text search scoped to a tag's members (see `buildSearchSelection`)
  // re-runs when that tag's membership changes.
  const resolveTagIds = useFilterTagIds(tagIndex, debouncedFilter);

  // True while the filter box still shows its seeded text (`'#inbox'` etc.) unedited, so the tag-id
  // selection applies; editing away falls back to normal text/tag parsing (Drafts hides the box).
  const isUnmodifiedSystemTagView = systemTag !== undefined && debouncedFilterText === (filterProp ?? '');
  const systemTagIdsKey = systemTagIds.join(',');
  const selection = useMemo(
    () =>
      isUnmodifiedSystemTagView
        ? buildSystemTagSelection(systemTagIds)
        : buildSearchSelection(Filter.type(Message.Message), debouncedFilterText, debouncedFilter, { resolveTagIds }),
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

  // Triage's priority bands regroup the list once any message carries one; until then it stays in date order.
  const priorityRanks = usePriorityRanks(db, tagIndex);
  const { items: rankedItems, getSection } = useMemo(
    () => groupByPriority(items, priorityRanks),
    [items, priorityRanks],
  );

  // Flat message list backing keyboard navigation and message-id lookups in action handlers.
  const messages = useMemo(
    () => rankedItems.flatMap((item) => (isMessageGroup(item) ? item.messages : [item])),
    [rankedItems],
  );

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

  const openDetail = ToolkitHooks.useDetailNavigation({
    contextId: id,
    getPath: (messageId) => getFeedObjectPath(id, messageId),
  });
  const handleNavigate = useCallback(
    (messageId: string, newPlank = false) => {
      if (!db || !messages.some((message) => message.id === messageId)) {
        return;
      }

      openDetail(messageId, { modified: newPlank });
    },
    [db, messages, openDetail],
  );

  useArticleKeyboardNavigation({ articleId: id, items: messages, currentId, onSelect: handleNavigate });

  const handleAction = useCallback<InboxStackActionHandler>(
    (action) => {
      switch (action.type) {
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
          const token = formatTag(action.label);
          // Check if tag already exists.
          const tags = previous.split(/\s+/).filter(Boolean);
          if (tags.at(-1)?.toLowerCase() !== token.toLowerCase()) {
            applyFilterText([previous.trim(), token].filter(Boolean).join(' ') + ' ');
          }
          filterEditorRef.current?.focus();
          break;
        }
      }
    },
    [
      db,
      id,
      mailbox,
      messages,
      invokePromise,
      showItem,
      handleNavigate,
      applyFilterText,
      filterTextRef,
      filterEditorRef,
    ],
  );

  const menuActions = useMailboxActions(mailbox, {
    sortDescending,
    nodeId: id,
    filterElement,
    hideFilterEditor: systemTag === 'draft',
  });

  return (
    <Panel.Root data-testid='inbox.mailbox'>
      <Panel.Header>
        <ActionToolbar {...menuActions} onAction={runAction} attendableId={id} />
      </Panel.Header>
      <Panel.Body>
        <Status.Deferred pending={showEmptyState} fallback={() => <InitializeMailbox mailbox={mailbox} />}>
          <InboxStack
            id={id}
            items={rankedItems}
            getSection={getSection}
            animateReorder
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
        </Status.Deferred>
      </Panel.Body>
      <Panel.Footer>
        <ProgressMeter
          classNames='border-t border-separator-subtle'
          state={progress?.status === 'running' || progress?.status === 'error' ? progress : undefined}
          onCancel={progressRegistry ? () => progress && progressRegistry.cancel(progress.name) : undefined}
        />
      </Panel.Footer>
    </Panel.Root>
  );
};

MailboxArticle.displayName = 'MailboxArticle';

/** Each message's priority band, as its index in {@link SystemTags.PRIORITY_TAGS}. */
const usePriorityRanks = (
  db: Database.Database | undefined,
  tagIndex: TagIndex.TagIndex | undefined,
): ReadonlyMap<string, number> => {
  // One hook pair per band, in band order; `PRIORITY_TAGS` is a fixed tuple, so the call order is stable.
  const urgent = useTaggedIds(tagIndex, useSystemTagUri(db, 'priorityUrgent'));
  const high = useTaggedIds(tagIndex, useSystemTagUri(db, 'priorityHigh'));
  const normal = useTaggedIds(tagIndex, useSystemTagUri(db, 'priorityNormal'));
  const low = useTaggedIds(tagIndex, useSystemTagUri(db, 'priorityLow'));
  return useMemo(() => {
    const ranks = new Map<string, number>();
    [urgent, high, normal, low].forEach((ids, rank) => {
      for (const id of ids) {
        // A message somehow in two bands sits in the more pressing one.
        if (!ranks.has(id)) {
          ranks.set(id, rank);
        }
      }
    });
    return ranks;
  }, [urgent, high, normal, low]);
};

/** The heading for messages no triage has reached yet. */
const UNTRIAGED_SECTION = { id: 'untriaged', label: 'Not triaged', hue: 'neutral' } as const;

/**
 * Orders entries by priority band (a conversation by its most pressing message), keeping each band
 * in query order, and names the band each entry sits under. With no message in any band the list is
 * returned as-is, ungrouped.
 */
const groupByPriority = (
  items: InboxStackItem[],
  ranks: ReadonlyMap<string, number>,
): { items: InboxStackItem[]; getSection?: (item: InboxStackItem) => InboxStackSection | undefined } => {
  if (ranks.size === 0) {
    return { items };
  }
  const untriaged = SystemTags.PRIORITY_TAGS.length;
  const rankOf = (item: InboxStackItem): number =>
    Math.min(
      untriaged,
      ...(isMessageGroup(item) ? item.messages : [item]).map((message) => ranks.get(message.id) ?? untriaged),
    );
  const ranked = items.map((item) => ({ item, rank: rankOf(item) }));
  // `Array.prototype.sort` is stable, so each band keeps the query's date order.
  ranked.sort((left, right) => left.rank - right.rank);
  const counts = new Map<number, number>();
  for (const { rank } of ranked) {
    counts.set(rank, (counts.get(rank) ?? 0) + 1);
  }
  const sections = new Map<number, InboxStackSection>(
    [...counts].map(([rank, count]) => {
      const id = SystemTags.PRIORITY_TAGS[rank];
      const band = id ? SystemTags.SystemTag[id] : UNTRIAGED_SECTION;
      return [rank, { id: band.id, label: band.label, hue: band.hue, count }];
    }),
  );
  const sectionOf = new Map(ranked.map(({ item, rank }) => [item, sections.get(rank)]));
  return { items: ranked.map(({ item }) => item), getSection: (item) => sectionOf.get(item) };
};

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
  const { graph } = ToolkitHooks.useAppGraph();
  const invoker = Hooks.useOperationInvoker();
  const [settings, setSettings] = Hooks.useAtomCapabilityState(InboxCapabilities.Settings);
  const loadRemoteImages = settings.loadRemoteImages ?? false;

  const handleCompose = useCallback(() => {
    const db = Obj.getDatabase(mailbox);
    invariant(db);
    // `nodeId` is this view's node, so the draft opens as a plank beside it rather than beside Drafts.
    void invoker.invokePromise(
      InboxOperation.DraftEmailAndOpen,
      { mailbox, contextId: nodeId },
      { spaceId: db.spaceId },
    );
  }, [invoker, mailbox, nodeId]);

  // Resolve capabilities here (in the container) and thread them into the presentation-only mailbox
  // action hooks — components (and the hooks they call) must not resolve capabilities themselves.
  const extractors = Hooks.useCapabilities(InboxCapabilities.ObjectExtractor);
  const injectedActions = Hooks.useCapabilities(InboxCapabilities.MailboxAction);
  const mailboxExtractorActions = useMailboxExtractorActions(mailbox, extractors, invoker);
  const mailboxActions = useInjectedMailboxActions(mailbox, injectedActions, invoker);

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

      // Mailbox-wide jobs (sync, analyze, extract) share the trailing ⋮ menu so the toolbar row stays
      // with the per-view controls; other contributed toolbar actions (Connect) keep their place in the row.
      return builder
        .separator('gap')
        .subgraph(graphActions(graph, get, nodeId, { filter: isToolbarAction, surface: TOOLBAR_DISPOSITION }))
        .action(
          'composeEmail',
          {
            type: 'composeEmail',
            icon: 'ph--pen--regular',
            label: ['compose-email.label', { ns: meta.profile.key }],
          },
          handleCompose,
        )
        .menu(
          TOOLBAR_OVERFLOW_ID,
          (menu) => {
            const jobs = graphActions(graph, get, nodeId, {
              filter: (action) => AppGraphNode.hasDisposition(action, MAILBOX_MENU_DISPOSITION),
              rootId: TOOLBAR_OVERFLOW_ID,
            });
            menu.subgraph(jobs);
            // Contributed actions (triage, plugin-crm's image search) are mailbox-wide
            // jobs like sync and analyze, not extractors, so they sit beside them.
            for (const item of mailboxActions) {
              menu.action(`mailbox-${item.id}`, { label: item.label, icon: item.icon }, item.onSelect);
            }
            if (mailboxExtractorActions.length > 0) {
              if (jobs.nodes.length > 0 || mailboxActions.length > 0) {
                menu.separator('line');
              }
              menu.group(
                'extract',
                {
                  label: ['mailbox-toolbar-extract.menu', { ns: meta.profile.key }],
                  icon: 'ph--magic-wand--regular',
                  testId: 'inbox.mailbox.extract',
                },
                (group) => {
                  for (const item of mailboxExtractorActions) {
                    group.action(`extract-${item.id}`, { label: item.label }, item.onSelect);
                  }
                },
              );
            }
          },
          'inbox.mailbox.more',
        )
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
