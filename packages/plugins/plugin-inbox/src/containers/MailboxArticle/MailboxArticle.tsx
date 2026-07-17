//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import React, { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  useAtomCapability,
  useAtomCapabilityState,
  useOperationInvoker,
  useOptionalCapability,
} from '@dxos/app-framework/ui';
import { AppCapabilities, LayoutOperation } from '@dxos/app-toolkit';
import { type AppSurface, ProgressMeter, useAppGraph, useProgress, useShowItem } from '@dxos/app-toolkit/ui';
import { Aggregate, type Database, Ref as EchoRef, Filter, Obj, Order, Query, Scope, Tag } from '@dxos/echo';
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
import { createTopicsProgressKey } from '../../operations/analyze/analyze-topics';
import { createSyncProgressKey } from '../../operations/mail/mail-sync';
import { messageMatchesQuery } from '../../util';
import { InitializeMailbox } from './InitializeMailbox';
import { buildMailboxSelection, getSearchText } from './mailbox-search';
import { MailboxFilter } from './MailboxFilter';

/** Messages per page for the lazily-loaded message window. */
const MAILBOX_PAGE_SIZE = 10;

/** Messages shown in a conversation card preview; the full thread size is surfaced via the group `count`. */
const MAILBOX_THREAD_PREVIEW_COUNT = 4;

export type MailboxArticleProps = AppSurface.ObjectArticleProps<
  Mailbox.Mailbox,
  {
    filter?: string;
  }
>;

export const MailboxArticle = ({ subject: mailbox, filter: filterProp, attendableId }: MailboxArticleProps) => {
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
  const selection = useMemo(
    () => buildMailboxSelection(debouncedFilterText, debouncedFilter),
    [debouncedFilterText, debouncedFilter],
  );
  const searchQuery = useMemo(() => getSearchText(debouncedFilter), [debouncedFilter]);
  // A thread qualifies if any of its messages match `selection`; the source then pulls in every
  // message sharing that thread's `threadId`, across the feed AND this space (drafts), so `count`/
  // `items` reflect the whole thread rather than only its filter-matching members. The space branch
  // can also surface another mailbox's draft that happens to share a `threadId` (thread ids are
  // effectively globally unique, so this is rare) — `reconcileDrafts` below re-scopes drafts to this
  // mailbox and drops ones already superseded by their synced copy.
  const source = feed
    ? (() => {
        const matches = Query.select(selection).from(feed);
        return Query.select(Filter.type(Message.Message, { threadId: Filter.in(matches.project('threadId')) })).from([
          Scope.feed(Obj.getURI(feed, { prefer: 'absolute' })),
          Scope.space(),
        ]);
      })()
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
    for (const entry of pagination.items) {
      if (!isThreadGroup(entry)) {
        result.push(entry);
      } else if (entry.threadId == null) {
        result.push(...entry.items.map((message) => ({ id: message.id, messages: [message] })));
      } else {
        result.push({ id: entry.threadId, messages: entry.items, total: entry.count });
      }
    }
    // Drop messages excluded by the mailbox's filters (e.g. "Ignore sender"); collapse now-empty groups.
    // During an active search, also drop messages that don't match in their plain/markdown body or
    // subject — ECHO's full-text index covers the whole object (including raw HTML blocks), so a
    // message can match the index yet have no matching (or any) plain/markdown text to display.
    // `reconcileDrafts` first re-scopes a thread's drafts to this mailbox and drops ones already
    // superseded by their synced copy (see the `source` query's doc comment above).
    const mailboxUri = Obj.getURI(mailbox);
    return result.flatMap((item): MessageStackItem[] => {
      const messageMatches = (message: Message.Message) =>
        !Mailbox.isFiltered(mailbox, message) && (!searchQuery || messageMatchesQuery(message, searchQuery));
      if (isMessageGroup(item)) {
        const messages = reconcileDrafts(item.messages, mailboxUri).filter(messageMatches);
        return messages.length > 0 ? [{ ...item, messages }] : [];
      }
      return messageMatches(item) ? [item] : [];
    });
  }, [pagination.items, mailbox, mailbox.messageFilters, searchQuery]);

  // Flat message list backing keyboard navigation and message-id lookups in action handlers.
  const messages = useMemo(() => items.flatMap((item) => (isMessageGroup(item) ? item.messages : [item])), [items]);

  // Gates on the query settling, not on `messages.length`, so the empty-mailbox panel never renders mid-load.
  const loading = !feed || pagination.isLoading;

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

  const menuActions = useMailboxActions(mailbox, { sortDescending, nodeId: id, filterElement });

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
            pagination={feed ? pagination : undefined}
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
 * Synced messages (no `properties.mailbox`) always pass; drafts pass only when they belong to this
 * mailbox and aren't yet superseded by their sent copy (matched on the provider id set at send
 * time). Mirrors the reconciliation in `app-graph-builder.ts`'s `mailboxMessage` connector — the
 * single multi-scope semi-join query (feed + this space) can pull in another mailbox's draft
 * sharing a `threadId`, or a draft whose sent copy has already synced into the feed.
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
};

const useMailboxActions = (
  mailbox: Mailbox.Mailbox,
  { sortDescending, nodeId, filterElement }: MailboxActionsOptions,
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
      // Always present (even for an empty mailbox — filtering an empty list is harmless).
      builder.action(
        'filter',
        { variant: 'custom', label: ['mailbox-toolbar.title', { ns: meta.profile.key }], render: () => filterElement },
        () => {},
      );

      return builder
        .separator('gap')
        .subgraph(graphActions(graph, get, nodeId, { filter: isToolbarAction, surface: TOOLBAR_DISPOSITION }))
        .build();
    },
    [
      graph,
      nodeId,
      filterElement,
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
