//
// Copyright 2026 DXOS.org
//

import { Atom, type Registry } from '@effect-atom/atom';
import * as Effect from 'effect/Effect';

import { type Capabilities } from '@dxos/app-framework';
import { type Graph } from '@dxos/app-graph';
import { type AppCapabilities, LayoutOperation } from '@dxos/app-toolkit';
import { Aggregate, Database, Ref as EchoRef, Filter, Obj, Order, Query, Scope, Tag } from '@dxos/echo';
import { QueryBuilder } from '@dxos/echo-query';
import { type PaginationResult, paginationAtom } from '@dxos/echo-react';
import { type ObjectExtractor } from '@dxos/extractor';
import { invariant } from '@dxos/invariant';
import { type EntityId } from '@dxos/keys';
import { log } from '@dxos/log';
import { type Progress } from '@dxos/progress';
import { type EditorController } from '@dxos/react-ui-editor';
import {
  type ActionGraphProps,
  MenuBuilder,
  TOOLBAR_DISPOSITION,
  graphActions,
  isToolbarAction,
} from '@dxos/react-ui-menu';
import { TagIndex } from '@dxos/schema';
import { DraftMessage, Message } from '@dxos/types';
import { type MenuActionChrome } from '@dxos/ui-types';

import {
  type InboxStackAction,
  type InboxStackItem,
  type InboxStackTag,
  type MessageTagsFamily,
  type StarredFamily,
  isMessageGroup,
} from '#components';
import { meta } from '#meta';
import { InboxCapabilities, InboxOperation, Mailbox, type Settings, SystemTags } from '#types';

import { POPOVER_SAVE_FILTER } from '../../constants';
import { createSyncProgressKey } from '../../operations/mail/mail-sync';
import { messageMatchesQuery } from '../../util';
import { debounceAtom } from './debounce-atom';
import { getInjectedMailboxActions, getMailboxExtractorActions } from './mailbox-menu-items';
import { buildMailboxSelection, buildSystemTagSelection, buildThreadSemiJoin, getSearchText } from './mailbox-search';

/** Messages per page for the lazily-loaded message window. */
const MAILBOX_PAGE_SIZE = 10;

/** Messages shown in a conversation card preview; the full thread size is surfaced via the group `count`. */
const MAILBOX_THREAD_PREVIEW_COUNT = 4;

/** Settle time for filter-text edits before the query AST changes (see `debouncedFilterText`). */
const FILTER_DEBOUNCE_MS = 300;

/**
 * Everything the mailbox view can be asked to do — the stack's own actions plus the
 * container-level messages (navigation, filter management, compose, sync cancel). One dispatch
 * routes them all; components never receive individual callbacks.
 */
export type MailboxMessage =
  | InboxStackAction
  | { type: 'navigate'; messageId: string; newPlank?: boolean }
  | { type: 'clear-filter' }
  | { type: 'save-filter' }
  | { type: 'compose' }
  | { type: 'cancel-sync' };

/**
 * Imperative bridge points the template registers (via ref callbacks) so dispatch arms can reach
 * the DOM: renderer-neutral logic addresses DOM locations by name, never by holding refs itself.
 */
export type MailboxAnchors = {
  /** Focused after a tag chip appends to the filter. */
  filterEditor?: EditorController | null;
  /** Anchor for the save-filter popover. */
  saveButton?: HTMLButtonElement | null;
};

/**
 * Named slot renderers supplied by the template, read lazily by the menu atom so the menu model
 * itself carries no layout. (The `render` contract comes from the menu model's own chrome type,
 * which is where the React type dependency lives today.)
 */
export type MailboxSlots = {
  filter?: NonNullable<MenuActionChrome['render']>;
};

export type MailboxControllerContext = {
  registry: Registry.Registry;
  mailbox: Mailbox.Mailbox;
  systemTag?: SystemTags.SystemTagId;
  /** Seeds the editable filter box; clearing restores it. */
  filterProp?: string;
  attendableId?: string;
  invoker: Capabilities.OperationInvoker;
  graph?: Graph.ReadableGraph;
  /** The plugin settings capability (itself a writable atom). */
  settings: Atom.Writable<Settings.Settings>;
  /** Contributed extractors / injected toolbar actions (capability atoms). */
  extractors: Atom.Atom<readonly ObjectExtractor[]>;
  injectedActions: Atom.Atom<readonly InboxCapabilities.MailboxAction[]>;
  /** Opens a created project as the mailbox's `topic` companion (encapsulates layout/attention wiring). */
  openTopic: (projectId: string) => void;
  progressRegistry?: AppCapabilities.ProgressRegistry;
  anchors: MailboxAnchors;
  slots: MailboxSlots;
};

export type MailboxControllerState = {
  filterText: Atom.Writable<string>;
  /** Parsed from the immediate (undebounced) text; gates the save affordance. */
  filter: Atom.Atom<Filter.Any | undefined>;
  /** Free-text term driving snippet highlighting (from the debounced filter). */
  searchQuery: Atom.Atom<string | undefined>;
  tagMap: Atom.Atom<Tag.Map>;
  items: Atom.Atom<InboxStackItem[]>;
  /** Flat message list backing keyboard navigation and message-id lookups in dispatch arms. */
  messages: Atom.Atom<Message.Message[]>;
  pagination: Atom.Atom<PaginationResult<unknown>>;
  loading: Atom.Atom<boolean>;
  showEmptyState: Atom.Atom<boolean>;
  tags: MessageTagsFamily;
  starred: StarredFamily;
  /** The sync progress task while it warrants showing (running or errored), else undefined. */
  progress: Atom.Atom<Progress.TaskProgress | undefined>;
};

export type MailboxController = {
  /** The mailbox's graph node id (the article's attendable id). */
  contextId: string;
  db: Database.Database | undefined;
  state: MailboxControllerState;
  menu: Atom.Atom<ActionGraphProps>;
  dispatch: (message: MailboxMessage) => void;
  /** Hides the search box (Drafts): free text can't be safely scoped to just this mailbox's drafts. */
  hideFilterEditor: boolean;
  /** Whether `cancel-sync` can do anything (the progress registry capability is optional). */
  canCancelSync: boolean;
  anchors: MailboxAnchors;
  slots: MailboxSlots;
};

/** One thread's worth of results from the conversation-aggregated message query (see the query below). */
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

const EMPTY_TAGS: InboxStackTag[] = [];

/**
 * All mailbox-view logic — queries, derived state, the menu model, and the action dispatcher — as
 * atoms over the ECHO/capability graph, constructed outside React (experiment: see the
 * declarative-ui-abstraction spec). The template subscribes to `state.*` and funnels every
 * interaction through `dispatch`.
 */
export const createMailboxController = (ctx: MailboxControllerContext): MailboxController => {
  const { registry, mailbox, systemTag, filterProp, invoker } = ctx;
  const db = Obj.getDatabase(mailbox);
  const contextId = ctx.attendableId ?? Obj.getURI(mailbox).toString();
  const seedText = filterProp ?? '';

  //
  // Filter state.
  //

  const filterText = Atom.make(seedText);
  // The ECHO query (and the `searchQuery` that drives highlighting) is driven by the DEBOUNCED
  // value so typing in the filter editor doesn't rebuild the paginated store and flash the list
  // empty on every keystroke — the query's AST only changes once typing pauses. The editor itself,
  // and the save-filter gating, stay bound to the immediate `filterText`.
  const debouncedFilterText = debounceAtom(filterText, FILTER_DEBOUNCE_MS);

  const tagsQuery = db?.query(Filter.type(Tag.Tag));
  // Tag registry keyed by the Tag object's URI — the id space used by meta.tags, the Mailbox tag
  // index, and the QueryBuilder's `tag:` filter.
  const tagMap = Atom.make((get): Tag.Map => {
    const tags = tagsQuery ? get(tagsQuery.atom) : [];
    return tags.reduce<Tag.Map>((acc, tag) => {
      acc[Obj.getURI(tag).toString()] = tag;
      return acc;
    }, {});
  });

  const queryBuilder = Atom.make((get) => new QueryBuilder(get(tagMap)));
  const filter = Atom.make((get) => get(queryBuilder).build(get(filterText)).filter);
  const debouncedFilter = Atom.make((get) => get(queryBuilder).build(get(debouncedFilterText)).filter);
  const searchQuery = Atom.make((get) => getSearchText(get(debouncedFilter)));

  //
  // Refs and tag machinery. Both refs are re-read under the mailbox snapshot atom so lazy
  // provisioning (`toggleTag` creating the tag index) flows through without a re-mount.
  //

  const feed = Atom.make((get) => {
    get(Obj.atom(mailbox));
    return get(mailbox.feed.atom);
  });

  const tagIndex = Atom.make((get) => {
    get(Obj.atom(mailbox));
    const ref = mailbox.tags;
    return ref ? get(ref.atom) : undefined;
  });

  /** A system tag's canonical object uri (its stable foreign key), or `undefined` before sync/creation. */
  const systemTagUriAtom = (tagId: SystemTags.SystemTagId): Atom.Atom<string | undefined> => {
    const query = db?.query(Filter.foreignKeys(Tag.Tag, [SystemTags.systemTagKey(tagId)]));
    return Atom.make((get) => {
      const tagObj = query ? get(query.atom)[0] : undefined;
      return tagObj && Obj.getURI(tagObj).toString();
    });
  };

  // Starred messages drive the per-tile star toggle; starred state also lives under the tag index.
  const starredUri = systemTagUriAtom('starred');
  // This view's canonical system tag, resolved by id (`undefined` until sync/first draft creates it).
  const systemTagUri = systemTag ? systemTagUriAtom(systemTag) : Atom.make((): string | undefined => undefined);

  // Reactive ids carrying the system tag in the tag index. Feed/space messages have no `meta.tags`
  // of their own — membership lives in the mailbox's `TagIndex` sibling object, so a bare
  // `Filter.tag` can't see it.
  const systemTagIds = Atom.make((get): readonly EntityId[] => {
    const index = get(tagIndex);
    const uri = get(systemTagUri);
    return index && uri ? get(TagIndex.taggedIdsAtom(index, uri)) : [];
  });

  /** Per-message tag chip family; each tile subscribes to only its own message's tags. */
  const tags: MessageTagsFamily = Atom.family((messageId: EntityId) =>
    Atom.make((get): InboxStackTag[] => {
      const index = get(tagIndex);
      if (!index) {
        return EMPTY_TAGS;
      }
      const map = get(tagMap);
      return get(TagIndex.atom(index)(messageId)).flatMap((uri) => {
        const tag = map[uri];
        return tag ? [{ id: uri, label: tag.label, hue: tag.hue }] : [];
      });
    }),
  );

  /** Per-message starred family; each tile subscribes to only its own star state. */
  const starred: StarredFamily = Atom.family((messageId: EntityId) =>
    Atom.make((get): boolean => {
      const index = get(tagIndex);
      const uri = get(starredUri);
      return index && uri ? get(TagIndex.atom(index, messageId, uri)) : false;
    }),
  );

  //
  // Query assembly and pagination.
  //

  const sortDescending = Atom.make(true);

  // True while the filter box still shows its seeded text (`'#inbox'` etc.) unedited, so the tag-id
  // selection applies; editing away falls back to normal text/tag parsing (Drafts hides the box).
  const isUnmodifiedSystemTagView = Atom.make(
    (get) => systemTag !== undefined && get(debouncedFilterText) === seedText,
  );

  // Order by message `created` (not feed insertion order): a backward/backfill sync appends out of
  // date order. The mailbox reads and sorts/groups the whole feed client-side; pagination and the
  // virtualizer bound only what's rendered, not what's fetched. Bounded-memory windowing isn't
  // possible here — ordering threads by a `max(created)` aggregate needs the full set to rank them.
  //
  // A thread qualifies if any of its messages match the selection, and `buildThreadSemiJoin` then
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
  const queryInfo = Atom.make((get): { query: Query.Any; hasSource: boolean } => {
    const feedObj = get(feed);
    const feedUri = feedObj && Obj.getURI(feedObj, { prefer: 'absolute' });
    const unmodified = get(isUnmodifiedSystemTagView);
    const scopes = feedUri ? [Scope.feed(feedUri), Scope.space()] : unmodified ? [Scope.space()] : undefined;
    const matchesScope = unmodified ? scopes : feedUri ? [Scope.feed(feedUri)] : undefined;
    const selection = unmodified
      ? buildSystemTagSelection(get(systemTagIds))
      : buildMailboxSelection(get(debouncedFilterText), get(debouncedFilter));
    const source = scopes && matchesScope ? buildThreadSemiJoin(selection, matchesScope).from(scopes) : undefined;
    if (!source) {
      return { query: Query.select(Filter.nothing()).limit(MAILBOX_PAGE_SIZE), hasSource: false };
    }

    const direction = get(sortDescending) ? 'desc' : 'asc';
    // Whether messages are grouped into conversations (threads). On by default.
    const conversations = get(ctx.settings).conversations ?? true;
    const query = conversations
      ? source
          .aggregate({
            threadId: Aggregate.group('threadId'),
            lastMessageAt: Aggregate.max('created'),
            count: Aggregate.count(),
            items: Aggregate.items({
              limit: MAILBOX_THREAD_PREVIEW_COUNT,
              order: [Order.property('created', 'desc')],
            }),
          })
          .orderBy(Order.property('lastMessageAt', direction))
          .limit(MAILBOX_PAGE_SIZE)
      : source.orderBy(Order.property('created', direction)).limit(MAILBOX_PAGE_SIZE);
    return { query, hasSource: true };
  });

  const pagination = paginationAtom<Message.Message | ThreadGroup>(
    db,
    Atom.make((get) => get(queryInfo).query),
  );

  // The aggregate query already orders threads (by latest message) and their members (newest-first),
  // so entries map straight to stack items. Messages without a `threadId` share the aggregate's
  // single `null`-key group; split them back into singleton conversations at that group's position.
  // A thread's preview is capped at `MAILBOX_THREAD_PREVIEW_COUNT`; `count` carries the full size.
  const items = Atom.make((get): InboxStackItem[] => {
    // Snapshot dep: message filters ("Ignore sender") and tag-index provisioning live on the mailbox.
    get(Obj.atom(mailbox));
    const result: InboxStackItem[] = [];
    for (const entry of get(pagination).items) {
      if (!isThreadGroup(entry)) {
        result.push(entry);
      } else if (entry.threadId == null) {
        result.push(...entry.items.map((message) => ({ id: message.id, messages: [message] })));
      } else {
        result.push({ id: entry.threadId, messages: entry.items, total: entry.count });
      }
    }
    return applyPostFilters(result, mailbox, get(searchQuery));
  });

  const messages = Atom.make((get) => get(items).flatMap((item) => (isMessageGroup(item) ? item.messages : [item])));

  // Drives an in-flow spinner in the list, never a full-panel fallback — a page fetch or a
  // background refresh must not blank the list. `hasSource` is false until a free-text feed resolves.
  const loading = Atom.make((get) => !get(queryInfo).hasSource || get(pagination).isLoading);
  // Show the empty-mailbox panel only once the query has settled with nothing, never mid-load.
  const showEmptyState = Atom.make((get) => !get(loading) && get(messages).length === 0);

  //
  // Progress (Gmail sync registers a monitor keyed by the mailbox URI).
  //

  const syncProgressKey = createSyncProgressKey(mailbox);
  const progressMonitor = ctx.progressRegistry?.monitorAtom(syncProgressKey);
  const progress = Atom.make((get): Progress.TaskProgress | undefined => {
    const task = progressMonitor ? get(progressMonitor) : undefined;
    return task && (task.status === 'running' || task.status === 'error') ? task : undefined;
  });

  //
  // Actions.
  //

  const navigate = (messageId: string, newPlank = false) => {
    const message = registry.get(messages).find((entry) => entry.id === messageId);
    if (!message || !db) {
      return;
    }
    // Open the message's conversation as its own plank beside the mailbox (add), never a companion.
    // The conversation node lives under this mailbox view; `MessageArticle` renders the whole thread.
    // Ordinarily `level` names the rung in the mailbox's declared chain, so reading down the mailbox
    // reuses one plank; meta/ctrl click asks for a plank of its own, so it opens without a level and
    // keeps whatever is already there.
    void invoker.invokePromise(LayoutOperation.Select, {
      contextId,
      subject: { mode: 'single', id: message.id },
    });
    void invoker.invokePromise(LayoutOperation.Open, {
      subject: [`${contextId}/${message.id}`],
      ...(newPlank ? {} : { root: contextId, level: 'message' }),
      pivotId: contextId,
      disposition: 'add',
      navigation: 'immediate',
    });
  };

  const dispatch = (message: MailboxMessage): void => {
    switch (message.type) {
      // A message click ('current') and a conversation click ('current-conversation') both open the
      // one unified conversation (thread) view — a single message is just a one-message conversation —
      // as a standalone plank beside the mailbox.
      case 'current':
      case 'current-conversation': {
        const target = registry.get(messages).find((entry) => entry.id === message.messageId);
        invariant(target);
        invariant(db);
        navigate(target.id, message.type === 'current' && message.newPlank);
        break;
      }

      case 'navigate': {
        navigate(message.messageId, message.newPlank);
        break;
      }

      case 'star': {
        const target = registry.get(messages).find((entry) => entry.id === message.messageId);
        if (target && db) {
          void Effect.runFork(
            SystemTags.toggleTag(mailbox, target, 'starred').pipe(Effect.provide(Database.layer(db))),
          );
        }
        break;
      }

      case 'ignore-sender': {
        const target = registry.get(messages).find((entry) => entry.id === message.messageId);
        const email = target?.sender?.email;
        if (email && db) {
          Mailbox.ignoreSender(mailbox, email);
          void db.flush();
        }
        break;
      }

      case 'create-topic': {
        const target = registry.get(messages).find((entry) => entry.id === message.messageId);
        if (target && db) {
          void invoker
            .invokePromise(
              InboxOperation.CreateProjectFromMessage,
              { mailbox: EchoRef.make(mailbox), message: target },
              { spaceId: db.spaceId },
            )
            .then((result) => {
              const projectId = result?.data?.projectId;
              if (projectId) {
                ctx.openTopic(projectId);
              }
            })
            // Surface the failure instead of silently swallowing it (AI timeout / DB error).
            .catch((err) => log.catch(err));
        }
        break;
      }

      case 'select-tag': {
        const previous = registry.get(filterText);
        // Skip when the tag is already the trailing term.
        const terms = previous.split(/\s+/).filter(Boolean);
        if (terms.at(-1)?.toLowerCase() !== '#' + message.label.toLowerCase()) {
          registry.set(filterText, [previous.trim(), '#' + message.label].filter(Boolean).join(' ') + ' ');
        }
        ctx.anchors.filterEditor?.focus();
        break;
      }

      case 'save-filter': {
        if (registry.get(filter)) {
          dispatch({ type: 'save', filter: registry.get(filterText) });
        }
        break;
      }

      case 'save': {
        void invoker.invokePromise(LayoutOperation.UpdatePopover, {
          subject: POPOVER_SAVE_FILTER,
          state: true,
          variant: 'virtual',
          anchor: ctx.anchors.saveButton,
          props: { mailbox, filter: message.filter },
        });
        break;
      }

      case 'clear-filter': {
        registry.set(filterText, seedText);
        break;
      }

      case 'compose': {
        invariant(db);
        // `contextId` is this view's node, so the draft opens as a plank beside it rather than beside Drafts.
        void invoker.invokePromise(InboxOperation.DraftEmailAndOpen, { db, mailbox, contextId });
        break;
      }

      case 'cancel-sync': {
        ctx.progressRegistry?.cancel(syncProgressKey);
        break;
      }

      // 'select' commits attention selection via the stack's own container; nothing to do here.
      case 'select':
        break;
    }
  };

  //
  // Menu.
  //

  const hideFilterEditor = systemTag === 'draft';

  const menu = Atom.make((get): ActionGraphProps => {
    const settings = get(ctx.settings);
    const loadRemoteImages = settings.loadRemoteImages ?? false;
    const descending = get(sortDescending);
    const extractActions = [
      ...getMailboxExtractorActions(mailbox, get(ctx.extractors), invoker),
      ...getInjectedMailboxActions(mailbox, get(ctx.injectedActions), invoker),
    ];

    // `MenuBuilder` mutates in place, so conditional actions can be added without reassignment.
    const builder = MenuBuilder.make()
      .root({ label: ['mailbox-toolbar.title', { ns: meta.profile.key }] })
      .action(
        'sortAscending',
        {
          type: 'sortDescending',
          icon: descending ? 'ph--sort-descending--regular' : 'ph--sort-ascending--regular',
          label: ['mailbox-toolbar-sort.menu', { ns: meta.profile.key }],
        },
        () => registry.set(sortDescending, !registry.get(sortDescending)),
      )
      .action(
        'loadRemoteImages',
        {
          type: 'loadRemoteImages',
          icon: loadRemoteImages ? 'ph--image--regular' : 'ph--image-broken--regular',
          label: ['message-toolbar-load-images.menu', { ns: meta.profile.key }],
          checked: loadRemoteImages,
        },
        () =>
          registry.set(ctx.settings, {
            ...registry.get(ctx.settings),
            loadRemoteImages: !registry.get(ctx.settings).loadRemoteImages,
          }),
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
        () => dispatch({ type: 'compose' }),
      );

    // The search box, rendered by the template's `filter` slot so the connect group can sit to its
    // right. Always present (even for an empty mailbox — filtering an empty list is harmless)
    // except in the Drafts view (see `hideFilterEditor`'s docstring).
    if (!hideFilterEditor) {
      builder.action(
        'filter',
        {
          variant: 'custom',
          label: ['mailbox-toolbar.title', { ns: meta.profile.key }],
          render: () => ctx.slots.filter?.(),
        },
        () => {},
      );
    }

    return builder
      .separator('gap')
      .subgraph(graphActions(ctx.graph, get, contextId, { filter: isToolbarAction, surface: TOOLBAR_DISPOSITION }))
      .build();
  });

  return {
    contextId,
    db,
    state: {
      filterText,
      filter,
      searchQuery,
      tagMap,
      items,
      messages,
      pagination,
      loading,
      showEmptyState,
      tags,
      starred,
      progress,
    },
    menu,
    dispatch,
    hideFilterEditor,
    canCancelSync: ctx.progressRegistry !== undefined,
    anchors: ctx.anchors,
    slots: ctx.slots,
  };
};

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
